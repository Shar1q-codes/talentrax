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
# Routes under test. Keep this list in step with `comingSoonRoutes` in
# src/content/navigation.ts - when a section is built, remove it from here at
# the same time you drop its noIndex and add it to app/sitemap.ts.
# ---------------------------------------------------------------------------
COMING_SOON_ROUTES=(
  /employers
  /employers/services
  /employers/request-talent
  /industries
  /specialties
  /job-seekers
  /job-seekers/upload-resume
  /jobs
  /locations
  /insights
  /research
  /resources
  /faq
  /about
  /contact
  /login
  /register
  /privacy-policy
  /terms
  /accessibility
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

# --- 2. canonical matches the expected origin -------------------------------
canonical_tag=$(printf '%s' "$home_html" | grep -o '<link rel="canonical" href="[^"]*"' | head -n 1)
canonical=${canonical_tag#'<link rel="canonical" href="'}
canonical=${canonical%\"}

if [ -z "$canonical" ]; then
  fail "home page has no <link rel=\"canonical\">"
elif [ "$canonical" = "$EXPECTED_ORIGIN" ] || [ "$canonical" = "$EXPECTED_ORIGIN/" ]; then
  pass "home canonical is $canonical"
else
  fail "home canonical is $canonical, expected $EXPECTED_ORIGIN"
fi

# --- 3. home page is indexable ----------------------------------------------
home_robots=$(robots_meta "$home_html")
case "$home_robots" in
  '')       fail "home page has no robots meta" ;;
  *noindex*) fail "home robots meta is \"$home_robots\" - the home page must be indexable" ;;
  *)        pass "home robots meta is \"$home_robots\" (no noindex)" ;;
esac

# --- 4. every coming-soon route is noindex ----------------------------------
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

# --- 5. the name is spelled correctly everywhere ----------------------------
# "TalentRax" with a capital R is wrong in mixed case. An all-caps TALENTRAX
# wordmark is fine, so match the capital R specifically rather than the word.
echo
name_failures=0
for route in "/" "${COMING_SOON_ROUTES[@]}"; do
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

# --- 6. unknown URLs 404 ----------------------------------------------------
echo
code=$(status_of "$BASE_URL$NOT_FOUND_PATH")
if [ "$code" = "404" ]; then
  pass "$NOT_FOUND_PATH returns HTTP 404"
else
  fail "$NOT_FOUND_PATH returned HTTP $code, expected 404"
fi

# --- 7. the 404 page carries exactly one robots meta ------------------------
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
