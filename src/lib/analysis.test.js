import { describe, expect, it } from "vitest";
import { analyzeProject, calculateScenario, evaluateSafety, recommendExperiment, scoreComparable, sourceCoverage } from "./analysis";

const project = {
  concept: {
    name: "Evidence Serum",
    description: "A calming ceramide serum",
    category: "Skincare",
    subcategory: "Serum",
    features: "ceramide calming barrier",
    audience: "Sensitive skin",
    positioning: "Clinically clear barrier support",
    retailPrice: "40",
    unitCost: "10",
    region: "Australia",
    channels: ["Own website"],
    monthlyTraffic: "10000",
    conversionLow: "1",
    conversionExpected: "2",
    conversionHigh: "3",
    cac: "25",
    marketingBudget: "12000",
    differentiationScore: "70",
    audienceFitScore: "80",
    trendMomentumScore: "60",
    channelFitScore: "75",
  },
  catalogue: {
    headers: ["product_name", "brand", "category", "features", "price", "rating", "reviews", "review_complaints", "monthly_sales", "conversion_rate", "cac", "url", "source", "observed_at"],
    data: [
      { product_name: "Barrier Serum", brand: "A", category: "Skincare", features: "ceramide barrier", price: "38", rating: "4.5", reviews: "200", review_complaints: "sticky texture", monthly_sales: "900", conversion_rate: "2", cac: "24", url: "https://example.com/a", source: "Licensed", observed_at: "2026-08-01" },
      { product_name: "Calming Serum", brand: "B", category: "Skincare", features: "calming barrier", price: "42", rating: "4.2", reviews: "120", review_complaints: "sticky packaging", monthly_sales: "700", conversion_rate: "1.8", cac: "28", url: "https://example.com/b", source: "Licensed", observed_at: "2026-08-02" },
      { product_name: "Daily Serum", brand: "C", category: "Skincare", features: "daily hydration", price: "35", rating: "4.0", reviews: "80", review_complaints: "packaging leaks", monthly_sales: "500", conversion_rate: "1.5", cac: "30", url: "https://example.com/c", source: "Licensed", observed_at: "2026-07-30" },
    ],
  },
};

describe("traceable analysis", () => {
  it("calculates planning scenarios and unit economics from supplied inputs", () => {
    const result = analyzeProject(project);
    expect(result.planningReady).toBe(true);
    expect(result.projection.expected.units).toBe(2400);
    expect(result.projection.expected.revenue).toBe(96000);
    expect(result.margin).toBe(75);
    expect(result.breakEvenVolume).toBe(400);
    expect(result.medianPrice).toBe(38);
    expect(result.confidence).toBe("Medium");
  });

  it("creates a total score only from available traceable sub-scores", () => {
    const result = analyzeProject(project);
    expect(result.availableScoreParts.length).toBeGreaterThanOrEqual(5);
    expect(result.demandScore).toBeGreaterThanOrEqual(0);
    expect(result.demandScore).toBeLessThanOrEqual(100);
    expect(result.scoreParts.every((part) => part.source)).toBe(true);
    expect(result.priceRecommendation.status).toBe("Within comparable range");
    expect(result.positioningRecommendation.message).toMatch(/sticky|packaging/);
  });

  it("ranks comparables and calculates scenario changes", () => {
    expect(scoreComparable(project.concept, project.catalogue.data[0])).toBeGreaterThan(scoreComparable(project.concept, project.catalogue.data[2]));
    const scenario = calculateScenario(project, { price: "50", conversionExpected: "2.5", bundleSize: "2", subscription: true });
    expect(scenario.effectivePrice).toBe(85);
    expect(scenario.annualUnits).toBe(3000);
    expect(scenario.annualRevenue).toBe(255000);
  });

  it("reports source coverage and recommendation from actual gaps", () => {
    const coverage = sourceCoverage(project);
    expect(coverage.present).toHaveLength(11);
    expect(coverage.freshest).toMatch(/^2026-08-02/);
    expect(recommendExperiment(analyzeProject({ concept: project.concept, catalogue: null })).type).toBe("Comparable research");
  });

  it("flags prohibited, regulated, and sensitive-audience language", () => {
    expect(evaluateSafety({ category: "Skincare", description: "Treat eczema" }).level).toBe("Review required");
    expect(evaluateSafety({ category: "Weapon accessories" }).level).toBe("Blocked");
    expect(evaluateSafety({ category: "Skincare", audience: "People with a health condition" }).level).toBe("Review required");
    expect(evaluateSafety({ category: "Skincare", description: "Daily moisturiser" }).level).toBe("Standard");
  });

  it("feeds completed experiment conversion and CAC results into the next forecast", () => {
    const calibrated = analyzeProject({
      ...project,
      experiments: [{ status: "Complete", observedConversion: "2.8", observedCac: "21" }],
    });
    expect(calibrated.experimentConversion).toBe(2.8);
    expect(calibrated.experimentCac).toBe(21);
    expect(calibrated.projection.expected.conversion).toBe(2.8);
    expect(calibrated.forecastSource).toBe("Completed experiment results");
  });
});
