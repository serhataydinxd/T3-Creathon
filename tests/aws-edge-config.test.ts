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

type FoundationTemplate = {
  Parameters: Record<string, { AllowedPattern?: string; Default?: string }>;
  Conditions: Record<string, unknown>;
  Resources: {
    LoadBalancerSecurityGroup: {
      Properties: {
        SecurityGroupIngress: {
          "Fn::If": [
            string,
            Array<{
              FromPort: number;
              ToPort: number;
              CidrIp?: string;
              SourcePrefixListId?: { Ref: string };
            }>,
            Array<{ FromPort: number; CidrIp?: string }>,
          ];
        };
      };
    };
  };
};

const foundation = JSON.parse(
  readFileSync(new URL("../infra/aws/foundation.json", import.meta.url), "utf8"),
) as FoundationTemplate;

const deployWorkflow = readFileSync(
  new URL("../.github/workflows/deploy-staging.yml", import.meta.url),
  "utf8",
);

const deployRole = readFileSync(
  new URL("../infra/aws/github-oidc-role.json", import.meta.url),
  "utf8",
);

describe("ALB exposure without an owned domain", () => {
  const ingress =
    foundation.Resources.LoadBalancerSecurityGroup.Properties.SecurityGroupIngress;
  const [condition, restricted, openToInternet] = ingress["Fn::If"];

  it("admits only the CloudFront edge while the ALB has no certificate", () => {
    expect(condition).toBe("RestrictAlbToCloudFront");
    expect(foundation.Conditions.RestrictAlbToCloudFront).toBeDefined();
    expect(restricted).toHaveLength(1);
    expect(restricted[0].SourcePrefixListId).toEqual({
      Ref: "CloudFrontPrefixListId",
    });
    expect(restricted[0].FromPort).toBe(80);
    expect(restricted.some((rule) => rule.CidrIp === "0.0.0.0/0")).toBe(false);
  });

  it("keeps public ingress available once a certificate terminates TLS at the ALB", () => {
    expect(openToInternet.some((rule) => rule.FromPort === 443)).toBe(true);
  });

  it("rejects a malformed prefix list identifier", () => {
    expect(foundation.Parameters.CloudFrontPrefixListId.AllowedPattern).toBe(
      "(pl-[0-9a-f]{4,20})?",
    );
    expect(foundation.Parameters.CloudFrontPrefixListId.Default).toBe("");
  });

  it("resolves the prefix list during deployment with read-only permission", () => {
    expect(deployWorkflow).toContain(
      "com.amazonaws.global.cloudfront.origin-facing",
    );
    expect(deployWorkflow).toContain(
      'CloudFrontPrefixListId="$CLOUDFRONT_PREFIX_LIST_ID"',
    );
    expect(deployRole).toContain("ec2:DescribeManagedPrefixLists");
  });
});
