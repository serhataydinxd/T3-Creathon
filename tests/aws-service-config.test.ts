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

const template = JSON.parse(
  readFileSync(new URL("../infra/aws/service.json", import.meta.url), "utf8"),
) as ServiceTemplate;

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
