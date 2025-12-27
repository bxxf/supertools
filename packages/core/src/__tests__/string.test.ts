import { describe, expect, it } from "bun:test";
import { toSnakeCase } from "../utils/string";

describe("toSnakeCase", () => {
  it("converts camelCase to snake_case", () => {
    expect(toSnakeCase("camelCase")).toBe("camel_case");
    expect(toSnakeCase("getUserById")).toBe("get_user_by_id");
    expect(toSnakeCase("parseJSON")).toBe("parse_json");
  });

  it("converts PascalCase to snake_case", () => {
    expect(toSnakeCase("PascalCase")).toBe("pascal_case");
    expect(toSnakeCase("GetUserById")).toBe("get_user_by_id");
    expect(toSnakeCase("HTTPRequest")).toBe("http_request");
  });

  it("handles consecutive uppercase letters", () => {
    expect(toSnakeCase("parseXMLData")).toBe("parse_xml_data");
    expect(toSnakeCase("getAPIKey")).toBe("get_api_key");
    expect(toSnakeCase("URLParser")).toBe("url_parser");
  });

  it("converts kebab-case to snake_case", () => {
    expect(toSnakeCase("kebab-case")).toBe("kebab_case");
    expect(toSnakeCase("get-user-by-id")).toBe("get_user_by_id");
  });

  it("handles already snake_case strings", () => {
    expect(toSnakeCase("snake_case")).toBe("snake_case");
    expect(toSnakeCase("get_user_by_id")).toBe("get_user_by_id");
  });

  it("handles single words", () => {
    expect(toSnakeCase("users")).toBe("users");
    expect(toSnakeCase("User")).toBe("user");
    expect(toSnakeCase("API")).toBe("api");
  });

  it("handles empty string", () => {
    expect(toSnakeCase("")).toBe("");
  });

  it("handles mixed formats", () => {
    expect(toSnakeCase("getUser-ById")).toBe("get_user_by_id");
    expect(toSnakeCase("parse_XMLData")).toBe("parse_xml_data");
  });

  it("handles numbers in names", () => {
    expect(toSnakeCase("getV2Users")).toBe("get_v2_users");
    expect(toSnakeCase("oauth2Token")).toBe("oauth2_token");
  });
});
