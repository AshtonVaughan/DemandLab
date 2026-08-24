export const SCORE_VERSION = "rules-v1.0";
export const FORECAST_VERSION = "planning-v1.0";

export const toNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(String(value).replace(/[$,%\s]/g, "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
};

export const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));

export const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export const average = (values) => {
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
};

export const percentile = (values, quantile) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const position = (sorted.length - 1) * quantile;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return lower === upper ? sorted[lower] : sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
};

function complaintThemes(rows) {
  const stopWords = new Set(["with", "this", "that", "from", "have", "were", "very", "product", "products", "when", "after", "about", "would", "could", "there", "their", "they", "them", "your"]);
  const counts = new Map();
  rows.forEach((row) => String(row.review_complaints || "").toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3 && !stopWords.has(word)).forEach((word) => counts.set(word, (counts.get(word) || 0) + 1)));
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4).map(([theme, count]) => ({ theme, count }));
}

export const formatMoney = (value, digits = 0, currency = "AUD") => {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: digits }).format(value);
};

export const formatNumber = (value, digits = 0) => {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: digits }).format(value);
};

const textTokens = (value) => new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 2));

function tokenSimilarity(left, right) {
  const a = textTokens(left);
  const b = textTokens(right);
  if (!a.size || !b.size) return null;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return (overlap / new Set([...a, ...b]).size) * 100;
}

function priceSimilarity(targetPrice, comparablePrice) {
  if (!Number.isFinite(targetPrice) || !Number.isFinite(comparablePrice) || Math.max(targetPrice, comparablePrice) === 0) return null;
  return clamp(100 - (Math.abs(targetPrice - comparablePrice) / Math.max(targetPrice, comparablePrice)) * 100);
}

export function scoreComparable(project, record) {
  const targetText = [project.name, project.category, project.subcategory, project.features, project.positioning, project.audience].join(" ");
  const recordText = [record.product_name, record.category, record.subcategory, record.features, record.positioning, record.audience].join(" ");
  const textScore = tokenSimilarity(targetText, recordText);
  const priceScore = priceSimilarity(toNumber(project.retailPrice), toNumber(record.price));
  const categoryScore = project.category && record.category
    ? (String(project.category).trim().toLowerCase() === String(record.category).trim().toLowerCase() ? 100 : 0)
    : null;
  const components = [textScore, priceScore, categoryScore].filter(Number.isFinite);
  return components.length ? Math.round(average(components)) : null;
}

export function analyzeProject(projectRecord) {
  const project = projectRecord?.concept || {};
  const catalogue = projectRecord?.catalogue || null;
  const rows = catalogue?.data || [];
  const prices = rows.map((row) => toNumber(row.price)).filter(Number.isFinite);
  const ratings = rows.map((row) => toNumber(row.rating)).filter(Number.isFinite);
  const reviews = rows.map((row) => toNumber(row.reviews)).filter(Number.isFinite);
  const monthlySales = rows.map((row) => toNumber(row.monthly_sales)).filter(Number.isFinite);
  const conversions = rows.map((row) => toNumber(row.conversion_rate)).filter(Number.isFinite);
  const cacs = rows.map((row) => toNumber(row.cac)).filter(Number.isFinite);
  const returns = rows.map((row) => toNumber(row.return_rate)).filter(Number.isFinite);
  const price = toNumber(project.retailPrice);
  const cost = toNumber(project.unitCost);
  const traffic = toNumber(project.monthlyTraffic);
  const completedExperimentConversions = (projectRecord?.experiments || []).filter((experiment) => experiment.status === "Complete").map((experiment) => toNumber(experiment.observedConversion)).filter(Number.isFinite);
  const completedExperimentCacs = (projectRecord?.experiments || []).filter((experiment) => experiment.status === "Complete").map((experiment) => toNumber(experiment.observedCac)).filter(Number.isFinite);
  const experimentConversion = median(completedExperimentConversions);
  const experimentCac = median(completedExperimentCacs);
  const forecastConversions = {
    low: toNumber(project.conversionLow),
    expected: Number.isFinite(experimentConversion) ? experimentConversion : toNumber(project.conversionExpected),
    high: toNumber(project.conversionHigh),
  };
  const planningReady = Number.isFinite(traffic) && Number.isFinite(price) && Object.values(forecastConversions).every(Number.isFinite);
  const projection = planningReady
    ? Object.fromEntries(Object.entries(forecastConversions).map(([key, conversion]) => [key, {
        conversion,
        units: traffic * (conversion / 100) * 12,
        revenue: traffic * (conversion / 100) * 12 * price,
      }]))
    : null;

  const marginValue = Number.isFinite(price) && Number.isFinite(cost) && price > 0 ? ((price - cost) / price) * 100 : null;
  const unitContribution = Number.isFinite(price) && Number.isFinite(cost) ? price - cost : null;
  const budget = toNumber(project.marketingBudget);
  const breakEvenVolume = Number.isFinite(budget) && Number.isFinite(unitContribution) && unitContribution > 0 ? Math.ceil(budget / unitContribution) : null;

  const conceptChecks = [project.name, project.description, project.category, project.subcategory, project.features, project.audience, project.retailPrice, project.unitCost, project.region, project.channels?.length, project.positioning];
  const performanceChecks = [project.monthlyTraffic, project.conversionLow, project.conversionExpected, project.conversionHigh, project.cac, project.marketingBudget];
  const evidenceColumns = ["product_name", "brand", "category", "features", "price", "rating", "reviews", "monthly_sales", "conversion_rate", "cac", "url", "source", "observed_at"];
  const evidenceComplete = evidenceColumns.filter((column) => catalogue?.headers?.includes(column)).length;
  const evidenceReadiness = Math.round(((conceptChecks.filter(Boolean).length + performanceChecks.filter(Boolean).length + evidenceComplete) / (conceptChecks.length + performanceChecks.length + evidenceColumns.length)) * 100);

  const medianPrice = median(prices);
  const lowerPrice = percentile(prices, 0.25);
  const upperPrice = percentile(prices, 0.75);
  const priceFit = Number.isFinite(price) && Number.isFinite(medianPrice) && medianPrice > 0
    ? Math.round(clamp(100 - Math.abs(price - medianPrice) / medianPrice * 100))
    : null;
  const marketDemand = monthlySales.length >= 3
    ? Math.round(clamp(25 * Math.log10(1 + median(monthlySales))))
    : null;
  const competitiveIntensity = rows.length >= 3
    ? Math.round(clamp(100 - Math.min(75, Math.log2(rows.length + 1) * 14)))
    : null;
  const differentiation = toNumber(project.differentiationScore);
  const audienceFit = toNumber(project.audienceFitScore);
  const trendMomentum = toNumber(project.trendMomentumScore);
  const channelFit = toNumber(project.channelFitScore);
  const reviewGap = reviews.length >= 3 && ratings.length >= 3
    ? Math.round(clamp((5 - median(ratings)) * 20 + Math.log10(1 + median(reviews)) * 8))
    : null;
  const evidenceQuality = evidenceReadiness;
  const scoreParts = [
    { key: "marketDemand", label: "Market demand", value: marketDemand, source: "Uploaded monthly_sales" },
    { key: "competitiveIntensity", label: "Competitive intensity", value: competitiveIntensity, source: "Uploaded comparable count" },
    { key: "differentiation", label: "Differentiation", value: differentiation, source: "User assessment" },
    { key: "priceFit", label: "Price fit", value: priceFit, source: "Uploaded prices" },
    { key: "audienceFit", label: "Audience fit", value: audienceFit, source: "User assessment" },
    { key: "trendMomentum", label: "Trend momentum", value: trendMomentum, source: "User assessment" },
    { key: "reviewGap", label: "Review-gap opportunity", value: reviewGap, source: "Uploaded ratings and reviews" },
    { key: "channelFit", label: "Channel fit", value: channelFit, source: "User assessment" },
    { key: "evidenceQuality", label: "Evidence quality", value: evidenceQuality, source: "Input coverage" },
  ];
  const availableScoreParts = scoreParts.filter((part) => Number.isFinite(part.value));
  const demandScore = availableScoreParts.length >= 5 ? Math.round(average(availableScoreParts.map((part) => part.value))) : null;

  const comparableRows = rows
    .map((row) => ({ ...row, similarity: scoreComparable(project, row) }))
    .sort((left, right) => (right.similarity ?? -1) - (left.similarity ?? -1));

  const themes = complaintThemes(rows);
  const priceRecommendation = Number.isFinite(price) && Number.isFinite(lowerPrice) && Number.isFinite(upperPrice)
    ? {
        status: price < lowerPrice ? "Below comparable range" : price > upperPrice ? "Above comparable range" : "Within comparable range",
        message: price < lowerPrice
          ? `The proposed price is below the observed middle 50% (${formatMoney(lowerPrice, 2)}–${formatMoney(upperPrice, 2)}). Test whether a higher price preserves conversion.`
          : price > upperPrice
            ? `The proposed price is above the observed middle 50% (${formatMoney(lowerPrice, 2)}–${formatMoney(upperPrice, 2)}). Validate the premium before launch.`
            : `The proposed price sits inside the observed middle 50% (${formatMoney(lowerPrice, 2)}–${formatMoney(upperPrice, 2)}).`,
        source: `${prices.length} uploaded prices`,
      }
    : null;
  const positioningRecommendation = themes.length
    ? { status: "Observed review gap", message: `Consider addressing recurring comparable complaints: ${themes.map((item) => item.theme).join(", ")}.`, source: `${rows.filter((row) => row.review_complaints).length} complaint records`, themes }
    : null;

  const assumptions = [
    planningReady ? `Monthly qualified traffic remains at ${formatNumber(traffic)}.` : null,
    planningReady ? "Conversion inputs supplied by the user remain applicable for 12 months." : null,
    Number.isFinite(price) ? `Retail price remains ${formatMoney(price, 2)}.` : null,
    Number.isFinite(cost) ? `Unit cost remains ${formatMoney(cost, 2)} before fulfilment and returns.` : null,
    Number.isFinite(experimentCac ?? toNumber(project.cac)) ? `Observed CAC remains ${formatMoney(experimentCac ?? toNumber(project.cac), 2)}.` : null,
    Number.isFinite(experimentConversion) ? `Expected conversion uses the median completed-experiment result of ${formatNumber(experimentConversion, 2)}%.` : null,
  ].filter(Boolean);
  const invalidators = [
    !monthlySales.length ? "No observed comparable sales data is available." : null,
    !Number.isFinite(traffic) ? "Qualified traffic has not been supplied." : null,
    !planningReady ? "A complete conversion range has not been supplied." : null,
    !Number.isFinite(cost) ? "Unit cost is missing, so margin and break-even estimates are incomplete." : null,
    !rows.length ? "No comparable-product dataset is attached." : null,
    !catalogue?.headers?.includes("observed_at") ? "Comparable freshness cannot be verified without observed_at." : null,
  ].filter(Boolean);

  const confidence = (evidenceReadiness >= 80 && monthlySales.length >= 5 && planningReady) || (planningReady && completedExperimentConversions.length >= 2) ? "High" : evidenceReadiness >= 50 && planningReady ? "Medium" : "Low";

  return {
    rows,
    comparableRows,
    rowCount: rows.length,
    medianPrice,
    lowerPrice,
    upperPrice,
    medianRating: median(ratings),
    totalReviews: reviews.length ? reviews.reduce((sum, value) => sum + value, 0) : null,
    observedSales: monthlySales.length ? monthlySales.reduce((sum, value) => sum + value, 0) : null,
    medianConversion: median(conversions),
    medianCac: median(cacs),
    medianReturnRate: median(returns),
    margin: marginValue,
    breakEvenVolume,
    price,
    cost,
    traffic,
    planningReady,
    projection,
    experimentConversion,
    experimentCac,
    completedExperimentCount: completedExperimentConversions.length,
    forecastSource: Number.isFinite(experimentConversion) ? "Completed experiment results" : "User baseline inputs",
    priceRecommendation,
    positioningRecommendation,
    evidenceReadiness,
    scoreParts,
    availableScoreParts,
    demandScore,
    confidence,
    assumptions,
    invalidators,
    modelVersion: SCORE_VERSION,
    forecastVersion: FORECAST_VERSION,
  };
}

export function calculateScenario(projectRecord, scenario) {
  const baseline = analyzeProject(projectRecord);
  const price = toNumber(scenario.price) ?? baseline.price;
  const conversion = toNumber(scenario.conversionExpected) ?? toNumber(projectRecord.concept.conversionExpected);
  const traffic = baseline.traffic;
  const bundleSize = Math.max(1, toNumber(scenario.bundleSize) || 1);
  const subscriptionFactor = scenario.subscription ? 0.85 : 1;
  const effectivePrice = price * bundleSize * subscriptionFactor;
  const annualUnits = Number.isFinite(traffic) && Number.isFinite(conversion) ? traffic * (conversion / 100) * 12 : null;
  const annualRevenue = Number.isFinite(annualUnits) ? annualUnits * effectivePrice : null;
  const unitCost = baseline.cost;
  const grossMargin = Number.isFinite(effectivePrice) && Number.isFinite(unitCost) && effectivePrice > 0
    ? ((effectivePrice - unitCost * bundleSize) / effectivePrice) * 100
    : null;
  return { price, conversion, traffic, bundleSize, effectivePrice, annualUnits, annualRevenue, grossMargin };
}

export function recommendExperiment(analysis) {
  if (!analysis.rowCount) return { type: "Comparable research", title: "Build a permitted comparable set", reason: "No comparable-product evidence is attached.", duration: 3, budget: 0, successMetric: "At least 10 verified comparable records" };
  if (!Number.isFinite(analysis.medianPrice)) return { type: "Pricing research", title: "Collect verified market prices", reason: "The uploaded evidence does not contain comparable prices.", duration: 3, budget: 0, successMetric: "Verified price for at least 80% of comparable records" };
  if (!analysis.planningReady) return { type: "Landing-page smoke test", title: "Measure baseline purchase intent", reason: "Traffic or conversion evidence is incomplete.", duration: 7, budget: 500, successMetric: "A measured conversion range from qualified traffic" };
  if (analysis.margin !== null && analysis.margin < 55) return { type: "Pricing test", title: "Test price elasticity before production", reason: "The current gross-margin potential is below 55%.", duration: 7, budget: 600, successMetric: "Conversion loss below the increase in contribution margin" };
  if (analysis.confidence === "Low") return { type: "Concept survey", title: "Validate audience-message fit", reason: "Evidence readiness is too low for a confident launch decision.", duration: 5, budget: 350, successMetric: "At least 100 qualified responses and clear message preference" };
  return { type: "Preorder experiment", title: "Run a capped preorder test", reason: "Core commercial inputs are present; observed purchase behavior is the next strongest signal.", duration: 14, budget: 1200, successMetric: "Predefined preorder conversion and CAC threshold" };
}

export function evaluateSafety(project) {
  const concept = project?.concept || project || {};
  const productText = [concept.name, concept.category, concept.subcategory, concept.description, concept.features, concept.positioning].join(" ").toLowerCase();
  const audienceText = String(concept.audience || "").toLowerCase();
  const prohibitedTerms = ["firearm", "weapon", "illegal drug", "tobacco", "vape", "explosive"];
  const regulatedTerms = ["medical", "therapeutic", "treat", "cure", "spf", "sunscreen", "acne", "eczema", "children", "child", "baby", "supplement", "finance", "investment"];
  const sensitiveAudienceTerms = ["race", "ethnicity", "religion", "disability", "sexual orientation", "pregnant", "health condition"];
  const prohibitedMatches = prohibitedTerms.filter((term) => productText.includes(term));
  const regulatedMatches = regulatedTerms.filter((term) => productText.includes(term));
  const audienceMatches = sensitiveAudienceTerms.filter((term) => audienceText.includes(term));
  if (prohibitedMatches.length) return { level: "Blocked", reason: `Potentially prohibited product language: ${prohibitedMatches.join(", ")}.`, matches: prohibitedMatches };
  if (regulatedMatches.length || audienceMatches.length) return { level: "Review required", reason: [...regulatedMatches.map((term) => `regulated claim: ${term}`), ...audienceMatches.map((term) => `sensitive audience: ${term}`)].join("; "), matches: [...regulatedMatches, ...audienceMatches] };
  return { level: "Standard", reason: "No regulated-product or sensitive-audience keywords were detected by the baseline check.", matches: [] };
}

export function sourceCoverage(projectRecord) {
  const catalogue = projectRecord?.catalogue;
  const rows = catalogue?.data || [];
  const headers = catalogue?.headers || [];
  const expected = ["product_name", "brand", "price", "rating", "reviews", "monthly_sales", "conversion_rate", "cac", "url", "source", "observed_at"];
  const present = expected.filter((field) => headers.includes(field));
  const filledCells = present.reduce((sum, field) => sum + rows.filter((row) => String(row[field] ?? "").trim()).length, 0);
  const coverage = rows.length && present.length ? Math.round((filledCells / (rows.length * expected.length)) * 100) : 0;
  const dates = rows.map((row) => Date.parse(row.observed_at)).filter(Number.isFinite);
  const freshest = dates.length ? new Date(Math.max(...dates)).toISOString() : null;
  return { expected, present, coverage, freshest, rowCount: rows.length };
}
