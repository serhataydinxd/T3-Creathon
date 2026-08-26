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
});
