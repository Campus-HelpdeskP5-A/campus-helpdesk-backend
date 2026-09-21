const request = require("supertest");
const app = require("../src/app");

describe("Health Check", () => {
  test("GET / should return API running message", async () => {
    const response = await request(app).get("/");

    expect(response.statusCode).toBe(200);

    expect(response.body).toEqual({
      message: "Campus Helpdesk API is running",
    });
  });

  test("GET /db-test should confirm database connection", async () => {
    const response = await request(app).get("/db-test");

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Database connected successfully");
    expect(response.body.time).toBeDefined();
  });
});