const request = require("supertest");
const app = require("../src/app");
const pool = require("../src/config/database");

afterAll(async () => {
  await pool.end();
});

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

    expect(response.body.message).toBe("Database connected successfully");
    expect(response.body.time).toBeDefined();
  });
});

describe("Authentication", () => {
  test("POST /api/auth/login should login admin successfully", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.email).toBe(
      process.env.TEST_ADMIN_EMAIL
    );
    expect(response.body.data.user.role_name).toBe("admin");
  });

  test("POST /api/auth/login should reject invalid password", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: "WrongPassword123!",
      });

    expect(response.statusCode).toBe(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Invalid email or password");
  });
});

describe("Authorization", () => {
  test("GET /api/users should reject requester role", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test.user@bua.edu.eg",
        password: "Test123!",
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .get("/api/users")
      .set("Authorization", `Bearer ${token}`);

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You do not have permission to access this resource"
    );
  });
});