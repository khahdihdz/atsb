export const languageCode = (value, fallback = "vi") => {
  const code = String(value || "").trim().toLowerCase();
  return /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(code) ? code : fallback;
};
export const splitText = (value, max = 4000) => {
  const chunks = []; let rest = String(value || "");
  while (rest.length > max) {
    let cut = rest.lastIndexOf("\n", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut < max * 0.5) cut = max;
    chunks.push(rest.slice(0, cut)); rest = rest.slice(cut).trimStart();
  }
  if (rest) chunks.push(rest);
  return chunks;
};
