#!/usr/bin/env bash
#
# check-seo.sh - assert this site's SEO invariants hold in the SERVER HTML.
#
# curl executes no JavaScript, so everything it sees was rendered on the server.
# That is the whole point of these checks: a crawler that never runs our JS must
# still see the canonical, the JSON-LD and the noindex directives.
#
# Usage:
#   scripts/check-seo.sh [BASE_URL] [EXPECTED_ORIGIN]
#
#   BASE_URL         where to send the requests. Default http://localhost:3000
#   EXPECTED_ORIGIN  the origin canonicals and JSON-LD @id values must claim.
#                    Default: BASE_URL.
#
# The two arguments differ whenever you serve a production build locally. The
# origin is inlined at BUILD time from NEXT_PUBLIC_SITE_URL, so a build stamped
# with the real domain correctly advertises that domain while being served from
# localhost:
#
#   NEXT_PUBLIC_SITE_URL=https://www.talentraxglobal.com npm run build
#   npm run start
#   scripts/check-seo.sh http://localhost:3000 https://www.talentraxglobal.com
#
# Every assertion runs; the script reports all failures and exits 1 if any fail.

set -uo pipefail

# ---------------------------------------------------------------------------
# Routes under test, in three kinds. "Built" and "indexable" are NOT the same
# thing, which is why there are three lists and not two.
#
# BUILT_ROUTES        must match app/sitemap.ts: 200, canonical, indexable,
#                     and listed in the sitemap.
# UNLISTED_ROUTES     built and real, but deliberately noindex AND absent from
#                     the sitemap. The account screens: they render, they
#                     cannot sign anyone in, and they are not advertised
#                     anywhere. Asserting both halves is the point - a future
#                     edit that makes one of them indexable, or slips it into
#                     the sitemap, fails here.
# COMING_SOON_ROUTES  must match `comingSoonRoutes` in content/navigation.ts:
#                     noindex, and absent from the sitemap. EMPTY TODAY -
#                     every route is built. The list and its assertions stay
#                     for the next unbuilt section.
#
# When a section is built it moves between these lists in the same commit that
# changes its noIndex and its sitemap entry.
# ---------------------------------------------------------------------------
BUILT_ROUTES=(
  /
  /employers
  /employers/services
  /employers/request-talent
  /job-seekers
  /job-seekers/upload-resume
  /jobs
  /about
  /contact
  /faq
  /resources
  /insights
  /locations
  /privacy-policy
  /terms
  /accessibility
)

# Built, noindex, and not in the sitemap. See the note above.
UNLISTED_ROUTES=(
  /login
  /register
  /forgot-password
)

# Empty: there are no unbuilt routes left.
COMING_SOON_ROUTES=()

# The engagement models, as anchors on /employers/services. The cards on
# /employers deep-link into these ids, so they are part of the URL contract:
# a retired model has to leave this list at the same time it leaves
# content/taxonomy.ts, and a renamed id has to be renamed here.
#
# RETIRED, and asserted absent so they cannot quietly come back: the client
# withdrew Healthcare RPO and Contract-to-Hire as offerings.
ENGAGEMENT_ANCHORS=(
  direct-hire
  contract
  executive-search
)

RETIRED_ANCHORS=(
  healthcare-rpo
  contract-to-hire
)

# A path no route claims, used for the 404 assertion.
NOT_FOUND_PATH="/__seo-check-no-such-page__"

# Index pages whose source is empty. Each must publish NO structured data:
# an ItemList of nothing is a machine-readable claim to have listings.
EMPTY_INDEX_ROUTES=(
  /jobs
)

# The article index. Populated, but it still publishes no structured data of
# its own: BlogPosting and FAQPage live on each article, and the index is
# asserted to link to at least one.
ARTICLE_INDEX=/insights

# How many published articles get the full detail-page assertions. Every one
# is checked for presence in the sitemap; the sample gets the JSON-LD parse.
ARTICLE_SAMPLE_SIZE=5

# Detail URLs with nothing behind them. An unknown slug is a 404 whether the
# source is empty or not.
MISSING_DETAIL_PATHS=(
  /jobs/__seo-check-no-such-job__
  /insights/__seo-check-no-such-article__
)

BASE_URL="${1:-http://localhost:3000}"
BASE_URL="${BASE_URL%/}"
EXPECTED_ORIGIN="${2:-$BASE_URL}"
EXPECTED_ORIGIN="${EXPECTED_ORIGIN%/}"

failures=0

pass() { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; failures=$((failures + 1)); }

# Body of a URL, or empty string if the request failed.
fetch() { curl -fsS --max-time 20 "$1" 2>/dev/null; }

status_of() { curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$1"; }

# Value of the first `content` attribute on a robots meta tag, or "" if absent.
# Next.js minifies the document onto one line, so line-oriented greps are no
# use here - match the tag itself and strip the wrapper.
robots_meta() {
  local tag
  tag=$(printf '%s' "$1" | grep -o '<meta name="robots" content="[^"]*"' | head -n 1)
  tag=${tag#'<meta name="robots" content="'}
  printf '%s' "${tag%\"}"
}

# href of the first canonical link, or "" if absent.
canonical_of() {
  local tag
  tag=$(printf '%s' "$1" | grep -o '<link rel="canonical" href="[^"]*"' | head -n 1)
  tag=${tag#'<link rel="canonical" href="'}
  printf '%s' "${tag%\"}"
}

count_matches() {
  printf '%s' "$2" | grep -o "$1" | wc -l | tr -d '[:space:]'
}

# Every JSON-LD payload on a page, one per line. The payloads hold no "<"
# (serializeJsonLd escapes it), so [^<]* stops at the closing tag.
ld_payloads() {
  printf '%s' "$1" | grep -o '<script type="application/ld+json">[^<]*</script>' \
    | sed 's/^<script type="application\/ld+json">//; s/<\/script>$//'
}

# ld_assert JSON TYPE FIELD... - the payload parses, is of TYPE, carries every
# FIELD non-empty, and (for a BlogPosting) names no author. Prints the reason
# on failure. grep cannot parse JSON; node built the site, so it is the
# honest way to make this assertion real.
ld_assert() {
  local json="$1"
  shift
  printf '%s' "$json" | node -e '
    const [type, ...fields] = process.argv.slice(1);
    let s = "";
    process.stdin.on("data", (c) => (s += c)).on("end", () => {
      let o;
      try { o = JSON.parse(s); } catch (e) { console.error("       " + e.message); process.exit(1); }
      const problems = [];
      if (o["@type"] !== type) problems.push("@type is " + o["@type"] + ", expected " + type);
      for (const f of fields) if (o[f] === undefined || o[f] === null || o[f] === "") problems.push("missing " + f);
      if (type === "BlogPosting" && "author" in o) problems.push("carries an author");
      if (type === "FAQPage" && !(Array.isArray(o.mainEntity) && o.mainEntity.length > 0)) problems.push("FAQPage with no questions");
      if (problems.length) { console.error("       " + problems.join("; ")); process.exit(1); }
    });
  ' "$@"
}

echo "SEO check"
echo "  base URL        $BASE_URL"
echo "  expected origin $EXPECTED_ORIGIN"
echo

# ---------------------------------------------------------------------------
home_html=$(fetch "$BASE_URL/")
if [ -z "$home_html" ]; then
  echo "  FAIL  could not fetch $BASE_URL/ - is the server running?"
  echo
  echo "1 assertion failed."
  exit 1
fi

# --- 1. exactly one JSON-LD block, and it is valid JSON ---------------------
ld_count=$(count_matches '<script type="application/ld+json">' "$home_html")
if [ "$ld_count" = "1" ]; then
  pass "home page has exactly one <script type=\"application/ld+json\">"
else
  fail "home page has $ld_count <script type=\"application/ld+json\"> tags, expected exactly 1"
fi

# The payload holds no "<", so [^<]* stops at the closing tag without needing
# non-greedy matching (which BRE has no way to express).
ld_block=$(printf '%s' "$home_html" | grep -o '<script type="application/ld+json">[^<]*</script>' | head -n 1)
ld_json=${ld_block#'<script type="application/ld+json">'}
ld_json=${ld_json%'</script>'}

if [ -z "$ld_json" ]; then
  fail "JSON-LD payload is empty or could not be extracted"
elif ! command -v node >/dev/null 2>&1; then
  # grep cannot actually parse JSON; node already ships with the toolchain that
  # built this site, so it is the honest way to make this assertion real.
  fail "node not found - cannot validate that the JSON-LD parses"
elif printf '%s' "$ld_json" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>{try{JSON.parse(s)}catch(e){console.error("       "+e.message);process.exit(1)}})'; then
  pass "JSON-LD payload parses as valid JSON"
else
  fail "JSON-LD payload is not valid JSON"
fi

# --- 2. every built route: correct canonical, and indexable -----------------
echo
echo "  built routes (${#BUILT_ROUTES[@]}):"
for route in "${BUILT_ROUTES[@]}"; do
  html=$(fetch "$BASE_URL$route")
  if [ -z "$html" ]; then
    fail "$route could not be fetched"
    continue
  fi

  expected="$EXPECTED_ORIGIN$route"
  canonical=$(canonical_of "$html")
  if [ -z "$canonical" ]; then
    fail "$route has no <link rel=\"canonical\">"
  elif [ "$canonical" = "$expected" ] || [ "$canonical" = "${expected%/}" ]; then
    pass "$route canonical is $canonical"
  else
    fail "$route canonical is $canonical, expected $expected"
  fi

  robots=$(robots_meta "$html")
  case "$robots" in
    '')        fail "$route has no robots meta" ;;
    *noindex*) fail "$route robots meta is \"$robots\" - a built route must be indexable" ;;
    *)         pass "$route robots meta is \"$robots\" (no noindex)" ;;
  esac
done

# --- 3. built but unlisted routes: they render, and they are NOT indexable --
# The account screens. Each must return 200 (it is a real page), carry
# noindex (it cannot do anything yet), and be absent from the sitemap. A page
# that signs nobody in has no business in search results, and the sitemap
# check further down catches the other half.
echo
echo "  unlisted routes (${#UNLISTED_ROUTES[@]}):"
for route in "${UNLISTED_ROUTES[@]}"; do
  code=$(status_of "$BASE_URL$route")
  if [ "$code" != "200" ]; then
    fail "$route returned HTTP $code, expected 200 - it is a built page"
    continue
  fi
  html=$(fetch "$BASE_URL$route")
  robots=$(robots_meta "$html")
  case "$robots" in
    *noindex*) pass "$route -> 200, \"$robots\"" ;;
    '')        fail "$route has no robots meta" ;;
    *)         fail "$route robots meta is \"$robots\" - an unwired account screen must be noindex" ;;
  esac
done

# --- 4. every coming-soon route is noindex ----------------------------------
echo
if [ "${#COMING_SOON_ROUTES[@]}" -eq 0 ]; then
  pass "no coming-soon routes remain (every route is built)"
else
  echo "  coming-soon routes (${#COMING_SOON_ROUTES[@]}):"
  for route in "${COMING_SOON_ROUTES[@]}"; do
    html=$(fetch "$BASE_URL$route")
    if [ -z "$html" ]; then
      fail "$route could not be fetched"
      continue
    fi
    robots=$(robots_meta "$html")
    case "$robots" in
      *noindex*) pass "$route -> \"$robots\"" ;;
      '')        fail "$route has no robots meta" ;;
      *)         fail "$route robots meta is \"$robots\", expected it to contain noindex" ;;
    esac
  done
fi

# --- 5. the sitemap lists the built routes and nothing that is noindex ------
echo
sitemap_xml=$(fetch "$BASE_URL/sitemap.xml")
if [ -z "$sitemap_xml" ]; then
  fail "sitemap.xml could not be fetched"
else
  for route in "${BUILT_ROUTES[@]}"; do
    if printf '%s' "$sitemap_xml" | grep -qF "<loc>$EXPECTED_ORIGIN$route</loc>"; then
      pass "sitemap lists $route"
    else
      fail "sitemap does not list $EXPECTED_ORIGIN$route"
    fi
  done

  # Listing a noindex page asks crawlers to index what we told them to skip.
  # Both kinds of noindex route are checked: the unbuilt ones and the built
  # ones we are deliberately not advertising.
  sitemap_noindex=0
  for route in "${COMING_SOON_ROUTES[@]}" "${UNLISTED_ROUTES[@]}"; do
    if printf '%s' "$sitemap_xml" | grep -qF "<loc>$EXPECTED_ORIGIN$route</loc>"; then
      fail "sitemap lists $route, which is noindex"
      sitemap_noindex=$((sitemap_noindex + 1))
    fi
  done
  if [ "$sitemap_noindex" -eq 0 ]; then
    pass "sitemap lists no noindex route"
  fi
fi

# --- 6. the engagement model anchors on the services page -------------------
# The cards on /employers link to /employers/services#<id>. If a section id
# changes or a model is retired without updating the cards, those links land
# at the top of the page instead of the section, silently.
echo
services_html=$(fetch "$BASE_URL/employers/services")
if [ -z "$services_html" ]; then
  fail "/employers/services could not be fetched"
else
  echo "  engagement models (${#ENGAGEMENT_ANCHORS[@]}):"
  for anchor in "${ENGAGEMENT_ANCHORS[@]}"; do
    if printf '%s' "$services_html" | grep -qF "id=\"$anchor\""; then
      pass "/employers/services has #$anchor"
    else
      fail "/employers/services has no #$anchor section"
    fi
  done

  # Every card link on /employers must point at one of those anchors.
  employers_html=$(fetch "$BASE_URL/employers")
  linked=$(printf '%s' "$employers_html" | grep -o '/employers/services#[a-z-]*' | sort -u)
  card_failures=0
  for link in $linked; do
    anchor=${link#/employers/services#}
    if ! printf '%s' "$services_html" | grep -qF "id=\"$anchor\""; then
      fail "/employers links to #$anchor, which does not exist on the services page"
      card_failures=$((card_failures + 1))
    fi
  done
  if [ "$card_failures" -eq 0 ]; then
    pass "every engagement card on /employers links to a section that exists"
  fi

  retired_found=0
  for anchor in "${RETIRED_ANCHORS[@]}"; do
    if printf '%s' "$services_html" | grep -qF "id=\"$anchor\""; then
      fail "/employers/services still has #$anchor - that model was retired"
      retired_found=$((retired_found + 1))
    fi
  done
  if [ "$retired_found" -eq 0 ]; then
    pass "no retired engagement model is published (${#RETIRED_ANCHORS[@]} checked)"
  fi
fi

# --- 7. empty indexes publish no structured data ----------------------------
# An ItemList of nothing, or a JobPosting for a job that does not exist, is a
# machine-readable claim to have listings we do not have. Google removes
# domains from Google for Jobs over fabricated postings, so this is asserted
# rather than trusted. Each index carries JSON-LD only once an item does, and
# then it lives on the item, not on the index.
echo
for route in "${EMPTY_INDEX_ROUTES[@]}"; do
  index_html=$(fetch "$BASE_URL$route")
  if [ -z "$index_html" ]; then
    fail "$route could not be fetched"
    continue
  fi
  index_ld=$(count_matches '<script type="application/ld+json">' "$index_html")
  if [ "$index_ld" = "0" ]; then
    pass "$route emits no JSON-LD (nothing published)"
  else
    fail "$route emits $index_ld JSON-LD block(s) - an empty index must publish none"
  fi
done

# --- 8. detail routes ---------------------------------------------------------
# /jobs/[slug] and /insights/[slug] generate a page per item. Both must 404
# for a slug that does not exist. /jobs generates none today, so the only
# further assertion is that no posting URL has leaked into the sitemap; the
# JobPosting assertions (pay range, validThrough) wait for a real posting.
# /insights is populated and gets its own section (8b) below.
# See CLAUDE.md, "The job board" and "The insights index".
echo
for path in "${MISSING_DETAIL_PATHS[@]}"; do
  detail_code=$(status_of "$BASE_URL$path")
  if [ "$detail_code" = "404" ]; then
    pass "$path returns HTTP 404"
  else
    fail "$path returned HTTP $detail_code, expected 404"
  fi
done

# An empty source must not have put a detail URL in the sitemap. Matches
# /jobs/<anything>, not the index page itself.
if [ -n "$sitemap_xml" ]; then
  job_locs=$(printf '%s' "$sitemap_xml" | grep -o "<loc>$EXPECTED_ORIGIN/jobs/[^<]*</loc>" | wc -l | tr -d '[:space:]')
  if [ "$job_locs" = "0" ]; then
    pass "sitemap lists nothing under /jobs/ (its source is empty)"
  else
    fail "sitemap lists $job_locs URL(s) under /jobs/ while its source is empty"
  fi
fi

# --- 8b. the article index and every published article ---------------------
# The index links to each article; the sitemap must list exactly those and
# nothing else under /insights/. The index itself emits no JSON-LD: the
# BlogPosting (and the FAQPage, where the article has FAQs) live on the
# article page, generated from the same data the page renders.
#
# What is asserted per article, on a sample: 200, canonical, indexable,
# exactly one <h1>, and every JSON-LD block parses - the first a BlogPosting
# with headline, description, both dates, publisher and url and no author;
# the second, if present, a FAQPage with at least one question.
echo
insights_html=$(fetch "$BASE_URL$ARTICLE_INDEX")
ARTICLE_PATHS=()
if [ -z "$insights_html" ]; then
  fail "$ARTICLE_INDEX could not be fetched"
else
  index_ld=$(count_matches '<script type="application/ld+json">' "$insights_html")
  if [ "$index_ld" = "0" ]; then
    pass "$ARTICLE_INDEX emits no JSON-LD (structured data lives on each article)"
  else
    fail "$ARTICLE_INDEX emits $index_ld JSON-LD block(s) - the index must publish none"
  fi

  while IFS= read -r path; do
    [ -n "$path" ] && ARTICLE_PATHS+=("$path")
  done < <(printf '%s' "$insights_html" | grep -o "href=\"$ARTICLE_INDEX/[a-z0-9-]*\"" | sed 's/^href="//; s/"$//' | sort -u)

  if [ "${#ARTICLE_PATHS[@]}" -gt 0 ]; then
    pass "$ARTICLE_INDEX links to ${#ARTICLE_PATHS[@]} article(s)"
  else
    fail "$ARTICLE_INDEX links to no articles - either the source is empty (then the empty state should show) or the links are missing"
  fi

  if [ -n "$sitemap_xml" ]; then
    missing_from_sitemap=0
    for path in "${ARTICLE_PATHS[@]}"; do
      if ! printf '%s' "$sitemap_xml" | grep -qF "<loc>$EXPECTED_ORIGIN$path</loc>"; then
        fail "sitemap does not list $path"
        missing_from_sitemap=$((missing_from_sitemap + 1))
      fi
    done
    article_locs=$(printf '%s' "$sitemap_xml" | grep -o "<loc>$EXPECTED_ORIGIN$ARTICLE_INDEX/[^<]*</loc>" | wc -l | tr -d '[:space:]')
    if [ "$missing_from_sitemap" -eq 0 ] && [ "$article_locs" = "${#ARTICLE_PATHS[@]}" ]; then
      pass "sitemap lists exactly the ${#ARTICLE_PATHS[@]} article(s) the index links to"
    elif [ "$missing_from_sitemap" -eq 0 ]; then
      fail "sitemap lists $article_locs URL(s) under $ARTICLE_INDEX/ but the index links to ${#ARTICLE_PATHS[@]}"
    fi
  fi
fi

ARTICLE_SAMPLE=("${ARTICLE_PATHS[@]:0:$ARTICLE_SAMPLE_SIZE}")
if [ "${#ARTICLE_SAMPLE[@]}" -gt 0 ]; then
  echo
  echo "  published articles (${#ARTICLE_SAMPLE[@]} of ${#ARTICLE_PATHS[@]} sampled):"
fi
for path in "${ARTICLE_SAMPLE[@]}"; do
  code=$(status_of "$BASE_URL$path")
  if [ "$code" != "200" ]; then
    fail "$path returned HTTP $code, expected 200"
    continue
  fi
  html=$(fetch "$BASE_URL$path")

  canonical=$(canonical_of "$html")
  if [ "$canonical" = "$EXPECTED_ORIGIN$path" ]; then
    pass "$path canonical is $canonical"
  else
    fail "$path canonical is \"$canonical\", expected $EXPECTED_ORIGIN$path"
  fi

  robots=$(robots_meta "$html")
  case "$robots" in
    '')        fail "$path has no robots meta" ;;
    *noindex*) fail "$path robots meta is \"$robots\" - a published article must be indexable" ;;
    *)         pass "$path robots meta is \"$robots\" (no noindex)" ;;
  esac

  h1_count=$(count_matches '<h1[ >]' "$html")
  if [ "$h1_count" = "1" ]; then
    pass "$path has exactly one <h1>"
  else
    fail "$path has $h1_count <h1> elements, expected exactly 1"
  fi

  ld_total=$(count_matches '<script type="application/ld+json">' "$html")
  case "$ld_total" in
    1|2) pass "$path has $ld_total JSON-LD block(s)" ;;
    *)   fail "$path has $ld_total JSON-LD blocks, expected 1 (BlogPosting) or 2 (plus FAQPage)" ;;
  esac

  ld_index=0
  while IFS= read -r payload; do
    [ -z "$payload" ] && continue
    ld_index=$((ld_index + 1))
    if [ "$ld_index" -eq 1 ]; then
      if ld_assert "$payload" BlogPosting headline description datePublished dateModified publisher url mainEntityOfPage; then
        pass "$path BlogPosting parses, carries every field and names no author"
      else
        fail "$path BlogPosting is malformed (see above)"
      fi
    else
      if ld_assert "$payload" FAQPage mainEntity; then
        pass "$path FAQPage parses with at least one question"
      else
        fail "$path FAQPage is malformed (see above)"
      fi
    fi
  done < <(ld_payloads "$html")
done

# --- 8c. the home page's latest-articles rail -------------------------------
# All six cards are in the server HTML (nothing loads on scroll), they are the
# first six the index lists - one explicit order, content/article-order.ts,
# for both - every one resolves, and the section links on to the index.
echo
HOME_RAIL_SIZE=6
home_articles=()
while IFS= read -r path; do
  [ -n "$path" ] && home_articles+=("$path")
done < <(printf '%s' "$home_html" | grep -o "href=\"$ARTICLE_INDEX/[a-z0-9-]*\"" | sed 's/^href="//; s/"$//' | awk '!seen[$0]++')

if [ "${#home_articles[@]}" = "$HOME_RAIL_SIZE" ]; then
  pass "home page server HTML links to $HOME_RAIL_SIZE articles"
else
  fail "home page links to ${#home_articles[@]} article(s), expected $HOME_RAIL_SIZE"
fi

index_first=$(printf '%s' "$insights_html" | grep -o "href=\"$ARTICLE_INDEX/[a-z0-9-]*\"" | sed 's/^href="//; s/"$//' | awk '!seen[$0]++' | head -n "$HOME_RAIL_SIZE")
if [ "$(printf '%s\n' "${home_articles[@]}")" = "$index_first" ]; then
  pass "home rail shows the first $HOME_RAIL_SIZE articles of $ARTICLE_INDEX, in its order"
else
  fail "home rail does not match the first $HOME_RAIL_SIZE articles of $ARTICLE_INDEX"
fi

for path in "${home_articles[@]}"; do
  code=$(status_of "$BASE_URL$path")
  if [ "$code" = "200" ]; then
    pass "home rail link $path returns 200"
  else
    fail "home rail link $path returns $code"
  fi
done

if printf '%s' "$home_html" | grep -qF "href=\"$ARTICLE_INDEX\""; then
  pass "home page links to $ARTICLE_INDEX for the rest"
else
  fail "home page does not link to $ARTICLE_INDEX"
fi

# --- 9. the name is spelled correctly everywhere ----------------------------
# "TalentRax" with a capital R is wrong in mixed case. An all-caps TALENTRAX
# wordmark is fine, so match the capital R specifically rather than the word.
echo
name_failures=0
for route in "${BUILT_ROUTES[@]}" "${UNLISTED_ROUTES[@]}" "${COMING_SOON_ROUTES[@]}" "${ARTICLE_SAMPLE[@]}"; do
  html=$(fetch "$BASE_URL$route")
  [ -z "$html" ] && continue
  hits=$(count_matches 'TalentRax' "$html")
  if [ "$hits" != "0" ]; then
    fail "$route spells the name \"TalentRax\" ($hits times) - the r is lowercase"
    name_failures=$((name_failures + 1))
  fi
done
if [ "$name_failures" -eq 0 ]; then
  pass "no page spells the name \"TalentRax\" (the r is lowercase everywhere)"
fi

# --- 10. unknown URLs 404 ----------------------------------------------------
echo
code=$(status_of "$BASE_URL$NOT_FOUND_PATH")
if [ "$code" = "404" ]; then
  pass "$NOT_FOUND_PATH returns HTTP 404"
else
  fail "$NOT_FOUND_PATH returned HTTP $code, expected 404"
fi

# --- 11. the 404 page carries exactly one robots meta -----------------------
# Next injects its own noindex on 404s. Setting robots in not-found.tsx as well
# produced two tags with the same meaning, which confused SEO audits.
not_found_html=$(curl -s --max-time 20 "$BASE_URL$NOT_FOUND_PATH")
nf_robots_count=$(count_matches '<meta name="robots"' "$not_found_html")
if [ "$nf_robots_count" = "1" ]; then
  pass "404 page has exactly one robots meta (\"$(robots_meta "$not_found_html")\")"
else
  fail "404 page has $nf_robots_count robots meta tags, expected exactly 1"
fi

echo
if [ "$failures" -eq 0 ]; then
  echo "All assertions passed."
  exit 0
fi
echo "$failures assertion(s) failed."
exit 1
