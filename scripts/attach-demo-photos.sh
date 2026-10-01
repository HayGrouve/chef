#!/usr/bin/env bash
# Uploads real dish photos (Wikimedia Commons) to the seeded test user's
# recipes on the dev deployment. Run after devSeed:seedTestUser.
#
#   scripts/attach-demo-photos.sh user_...
set -euo pipefail
USER_ID="$1"
COMMONS="https://upload.wikimedia.org/wikipedia/commons/thumb"
declare -A PHOTOS=(
  ["Weeknight Chicken Tikka Masala"]="0/00/Chicken_tikka_masala_%28cropped%29.jpg"
  ["Lemon Garlic Butter Salmon"]="7/79/Pan-Seared_Salmon.jpg"
  ["Shakshuka"]="1/18/Shakshuka_by_Calliopejen1.jpg"
  ["Overnight Oats with Berries"]="d/da/Dorset_Cereals_muesli.jpg"
  ["Classic Beef Chili"]="5/50/Bowl_of_chili.jpg"
  ["Mushroom Risotto"]="a/a5/Risotto_with_speck_and_goat_cheese_%286101067436%29.jpg"
  ["Greek Salad Wraps"]="f/f8/Smoked_chicken_and_avocado_wrap.jpg"
  ["Thai Peanut Noodles"]="3/39/Phat_Thai_kung_Chang_Khien_street_stall.jpg"
  ["Banana Bread"]="5/55/Banana_bread_slices.jpg"
)
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
for title in "${!PHOTOS[@]}"; do
  path="${PHOTOS[$title]}"
  curl -sf -A "chef-dev-seed/1.0" -o "$TMP" "$COMMONS/$path/1280px-${path##*/}"
  url=$(npx convex run devSeed:photoUploadUrl | tr -d '"')
  storage_id=$(curl -sf -X POST -H "Content-Type: image/jpeg" --data-binary @"$TMP" "$url" | jq -r .storageId)
  npx convex run devSeed:setRecipePhoto "$(jq -nc --arg u "$USER_ID" --arg t "$title" --arg s "$storage_id" '{userId:$u,title:$t,storageId:$s}')" >/dev/null
  echo "✓ $title"
done
