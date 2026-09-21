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
# Routes under test.
#
# BUILT_ROUTES must match app/sitemap.ts: indexable, canonical, in the sitemap.
# COMING_SOON_ROUTES must match `comingSoonRoutes` in content/navigation.ts:
# noindex, and absent from the sitemap.
#
# When a section is built it moves from the second list to the first, in the
# same commit that drops its noIndex and adds it to the sitemap.
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
  /privacy-policy
  /terms
)

COMING_SOON_ROUTES=(
  /industries
  /specialties
  /locations
  /insights
  /research
  /resources
  /faq
  /login
  /register
  /accessibility
)

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

# --- 3. every coming-soon route is noindex ----------------------------------
echo
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

# --- 4. the sitemap lists the built routes and nothing that is noindex ------
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
  sitemap_noindex=0
  for route in "${COMING_SOON_ROUTES[@]}"; do
    if printf '%s' "$sitemap_xml" | grep -qF "<loc>$EXPECTED_ORIGIN$route</loc>"; then
      fail "sitemap lists $route, which is noindex"
      sitemap_noindex=$((sitemap_noindex + 1))
    fi
  done
  if [ "$sitemap_noindex" -eq 0 ]; then
    pass "sitemap lists no noindex route"
  fi
fi

# --- 5. the engagement model anchors on the services page -------------------
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

# --- 6. the job board publishes no structured data while it is empty --------
# An ItemList of nothing, or a JobPosting for a job that does not exist, is a
# machine-readable claim that we have listings when we do not. Google removes
# domains from Google for Jobs over fabricated postings, so this is asserted
# rather than trusted. The board carries JSON-LD only once a posting does,
# and then it lives on the posting, not here.
echo
jobs_html=$(fetch "$BASE_URL/jobs")
if [ -z "$jobs_html" ]; then
  fail "/jobs could not be fetched"
else
  jobs_ld=$(count_matches '<script type="application/ld+json">' "$jobs_html")
  if [ "$jobs_ld" = "0" ]; then
    pass "/jobs emits no JSON-LD (the board is empty)"
  else
    fail "/jobs emits $jobs_ld JSON-LD block(s) - an empty board must publish none"
  fi
fi

# --- 7. the name is spelled correctly everywhere ----------------------------
# "TalentRax" with a capital R is wrong in mixed case. An all-caps TALENTRAX
# wordmark is fine, so match the capital R specifically rather than the word.
echo
name_failures=0
for route in "${BUILT_ROUTES[@]}" "${COMING_SOON_ROUTES[@]}"; do
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

# --- 8. unknown URLs 404 ----------------------------------------------------
echo
code=$(status_of "$BASE_URL$NOT_FOUND_PATH")
if [ "$code" = "404" ]; then
  pass "$NOT_FOUND_PATH returns HTTP 404"
else
  fail "$NOT_FOUND_PATH returned HTTP $code, expected 404"
fi

# --- 9. the 404 page carries exactly one robots meta ------------------------
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
