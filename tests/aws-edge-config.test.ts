import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type EdgeTemplate = {
  Resources: {
    Distribution: {
      Properties: {
        DistributionConfig: {
          DefaultCacheBehavior: {
            AllowedMethods: string[];
            CachePolicyId: string;
            OriginRequestPolicyId: string;
            ViewerProtocolPolicy: string;
          };
          Origins: Array<{
            CustomOriginConfig: { OriginProtocolPolicy: string };
          }>;
          ViewerCertificate: { CloudFrontDefaultCertificate: boolean };
        };
      };
    };
  };
};

const template = JSON.parse(
  readFileSync(new URL("../infra/aws/edge.json", import.meta.url), "utf8"),
) as EdgeTemplate;

describe("AWS HTTPS edge configuration", () => {
  const config = template.Resources.Distribution.Properties.DistributionConfig;
  const behavior = config.DefaultCacheBehavior;

  it("uses the CloudFront certificate and redirects viewers to HTTPS", () => {
    expect(config.ViewerCertificate.CloudFrontDefaultCertificate).toBe(true);
    expect(behavior.ViewerProtocolPolicy).toBe("redirect-to-https");
  });

  it("does not cache authenticated pages and forwards the viewer host and session", () => {
    expect(behavior.CachePolicyId).toBe("4135ea2d-6df8-44a3-9df3-4b5a84be39ad");
    expect(behavior.OriginRequestPolicyId).toBe("216adef6-5c7f-47e4-b989-5492eafa07d3");
    expect(behavior.AllowedMethods).toEqual(expect.arrayContaining(["GET", "POST", "PATCH", "DELETE"]));
  });

  it("documents the temporary HTTP origin boundary", () => {
    expect(config.Origins[0].CustomOriginConfig.OriginProtocolPolicy).toBe("http-only");
  });
});
