import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type EnvironmentEntry = { Name: string; Value: unknown };
type ServiceTemplate = {
  Resources: {
    WebTaskDefinition: {
      Properties: {
        ContainerDefinitions: Array<{
          Environment: EnvironmentEntry[];
          HealthCheck: { Command: string[] };
        }>;
      };
    };
  };
};

type BootstrapTemplate = {
  Resources: {
    BootstrapTaskDefinition: {
      Properties: {
        ContainerDefinitions: Array<{ Environment: EnvironmentEntry[] }>;
      };
    };
  };
};

type OidcTemplate = {
  Resources: {
    CloudFormationExecutionRole: {
      Properties: {
        Policies: Array<{
          PolicyDocument: { Statement: Array<{ Action: string[] }> };
        }>;
      };
    };
  };
};

const template = JSON.parse(
  readFileSync(new URL("../infra/aws/service.json", import.meta.url), "utf8"),
) as ServiceTemplate;

const bootstrapTemplate = JSON.parse(
  readFileSync(new URL("../infra/aws/bootstrap-manager.json", import.meta.url), "utf8"),
) as BootstrapTemplate;

const bootstrapWorkflow = readFileSync(
  new URL("../.github/workflows/bootstrap-staging-manager.yml", import.meta.url),
  "utf8",
);

const oidcTemplate = JSON.parse(
  readFileSync(new URL("../infra/aws/github-oidc-role.json", import.meta.url), "utf8"),
) as OidcTemplate;

describe("AWS web task configuration", () => {
  it("binds Next.js to every interface when probing it over loopback", () => {
    const container =
      template.Resources.WebTaskDefinition.Properties.ContainerDefinitions[0];
    const hostname = container.Environment.find(
      (entry) => entry.Name === "HOSTNAME",
    );

    expect(hostname?.Value).toBe("0.0.0.0");
    expect(container.HealthCheck.Command.join(" ")).toContain("127.0.0.1:3000");
  });
});

describe("AWS manager bootstrap configuration", () => {
  it("uses the bundled RDS trust store for its TLS database connection", () => {
    const environment =
      bootstrapTemplate.Resources.BootstrapTaskDefinition.Properties.ContainerDefinitions[0].Environment;

    expect(environment).toContainEqual({
      Name: "DATABASE_CA_CERT",
      Value: "/app/rds-ca.pem",
    });
    expect(environment).toContainEqual({ Name: "DATABASE_SSL", Value: "true" });
  });

  it("acknowledges the temporary IAM policy when deploying the bootstrap stack", () => {
    expect(bootstrapWorkflow).toContain("--capabilities CAPABILITY_IAM");
  });

  it("reports bootstrap stack events before deleting ephemeral resources", () => {
    const reportIndex = bootstrapWorkflow.indexOf("Report bootstrap failure details");
    const cleanupIndex = bootstrapWorkflow.indexOf("Delete ephemeral bootstrap resources");

    expect(reportIndex).toBeGreaterThan(-1);
    expect(cleanupIndex).toBeGreaterThan(reportIndex);
  });

  it("lets CloudFormation reconcile the temporary inline role policy", () => {
    const actions =
      oidcTemplate.Resources.CloudFormationExecutionRole.Properties.Policies[0]
        .PolicyDocument.Statement[0].Action;

    expect(actions).toContain("iam:GetRolePolicy");
    expect(actions).toContain("iam:PutRolePolicy");
    expect(actions).toContain("iam:DeleteRolePolicy");
  });
});

describe("generation provider wiring", () => {
  const service = JSON.parse(
    readFileSync(new URL("../infra/aws/service.json", import.meta.url), "utf8"),
  ) as {
    Parameters: Record<string, { Default?: string; AllowedValues?: string[]; NoEcho?: boolean }>;
    Conditions: Record<string, unknown>;
    Resources: {
      WebTaskDefinition: {
        Properties: {
          ContainerDefinitions: Array<{
            Environment: EnvironmentEntry[];
            Secrets: { "Fn::If": [string, Array<{ Name: string }>, Array<{ Name: string }>] };
          }>;
        };
      };
    };
  };
  const foundation = readFileSync(new URL("../infra/aws/foundation.json", import.meta.url), "utf8");
  const edge = JSON.parse(
    readFileSync(new URL("../infra/aws/edge.json", import.meta.url), "utf8"),
  ) as {
    Resources: {
      Distribution: {
        Properties: {
          DistributionConfig: { Origins: Array<{ CustomOriginConfig: { OriginReadTimeout: number } }> };
        };
      };
    };
  };
  const workflow = readFileSync(
    new URL("../.github/workflows/deploy-staging.yml", import.meta.url),
    "utf8",
  );
  const container = service.Resources.WebTaskDefinition.Properties.ContainerDefinitions[0];

  it("defaults to replay and only allows the two known modes", () => {
    expect(service.Parameters.AppMode.Default).toBe("replay");
    expect(service.Parameters.AppMode.AllowedValues).toEqual(["replay", "live"]);
    expect(container.Environment.find((entry) => entry.Name === "APP_MODE")?.Value).toEqual({
      Ref: "AppMode",
    });
  });

  it("injects the key as a secret only when one is configured", () => {
    expect(service.Conditions.HasProviderSecret).toBeDefined();
    expect(service.Parameters.ProviderSecretArn.NoEcho).toBe(true);
    expect(service.Parameters.ProviderSecretArn.Default).toBe("");
    const [condition, withSecret, withoutSecret] = container.Secrets["Fn::If"];
    expect(condition).toBe("HasProviderSecret");
    expect(withSecret.map((entry) => entry.Name)).toContain("LLM_API_KEY");
    expect(withoutSecret.map((entry) => entry.Name)).not.toContain("LLM_API_KEY");
    // The key must never be passed as a plain task environment variable.
    expect(container.Environment.map((entry) => entry.Name)).not.toContain("LLM_API_KEY");
  });

  it("passes the provider endpoint and model as non-secret configuration", () => {
    expect(container.Environment.find((entry) => entry.Name === "LLM_BASE_URL")?.Value).toEqual({
      Ref: "ProviderBaseUrl",
    });
    expect(container.Environment.find((entry) => entry.Name === "LLM_MODEL")?.Value).toEqual({
      Ref: "ProviderModel",
    });
    expect(service.Parameters.ProviderBaseUrl.Default).toBe("https://api.openai.com/v1");
    expect(service.Parameters.ProviderModel.Default).toBe("gpt-5.6-luna");
  });

  it("lets the execution role read only the generation secret it needs", () => {
    expect(foundation).toContain("ReadGenerationProviderKey");
    expect(foundation).toContain("${EnvironmentName}/generation-provider-*");
  });

  it("keeps the edge origin timeout above the in-app generation timeout", () => {
    // The app abandons a slow provider at 45s, so the edge must wait longer or
    // a slow answer surfaces as a gateway error instead of a replay fallback.
    expect(
      edge.Resources.Distribution.Properties.DistributionConfig.Origins[0].CustomOriginConfig
        .OriginReadTimeout,
    ).toBe(60);
  });

  it("stores the key through Secrets Manager rather than the workflow environment", () => {
    expect(workflow).toContain("$ENVIRONMENT_NAME/generation-provider");
    expect(workflow).toContain("secretsmanager put-secret-value");
    expect(workflow).toContain('AppMode="$APP_MODE"');
    expect(workflow).toContain('ProviderBaseUrl="$PROVIDER_BASE_URL"');
    expect(workflow).toContain('ProviderModel="$PROVIDER_MODEL"');
    expect(workflow).toContain("--force-new-deployment");
    // An absent key must leave the service in replay instead of failing the deploy.
    expect(workflow).toContain("the service stays in replay mode");
  });
});
