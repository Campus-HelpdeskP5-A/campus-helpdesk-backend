const DEFAULT_EMERGENCY_KEYWORDS = [
  "fire",
  "smoke",
  "gas leak",
  "explosion",
  "medical emergency",
  "life threatening",
  "active violence",
];

const getEmergencyKeywords = () => {
  const configured = process.env.EMERGENCY_KEYWORDS
    ?.split(",")
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean);

  return configured?.length
    ? configured
    : DEFAULT_EMERGENCY_KEYWORDS;
};

const detectEmergency = ({ title = "", description = "" }) => {
  const text = `${title} ${description}`.toLowerCase();
  const matchedKeywords = getEmergencyKeywords().filter(
    (keyword) => text.includes(keyword)
  );

  return {
    detected: matchedKeywords.length > 0,
    matched_keywords: matchedKeywords,
    guidance:
      matchedKeywords.length > 0
        ? "If there is immediate danger, leave the area and contact the official campus emergency channel or local emergency services. Do not wait for this ticket to be processed."
        : null,
  };
};

module.exports = {
  detectEmergency,
};
