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

describe("Categories", () => {
  test("GET /api/categories should return categories", async () => {
    const response = await request(app).get("/api/categories");

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test("GET /api/categories/:id should return category by ID", async () => {
    const response = await request(app).get("/api/categories/1");

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.category_id).toBe(1);
    expect(response.body.data.category_name).toBeDefined();
  });

  test("POST /api/categories should create category as admin", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const categoryName = `Test Category ${Date.now()}`;

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: categoryName,
      });

    expect(response.statusCode).toBe(201);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Category created successfully");
    expect(response.body.data.category_id).toBeDefined();
    expect(response.body.data.category_name).toBe(categoryName);
  });

  test("POST /api/categories should return 400 when category name is missing", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: "",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("category_name is required");
  });

  test("POST /api/categories should return 409 for duplicate category name", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const categoryName = `Duplicate Category ${Date.now()}`;

    const firstResponse = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: categoryName,
      });

    expect(firstResponse.statusCode).toBe(201);

    const secondResponse = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: categoryName,
      });

    expect(secondResponse.statusCode).toBe(409);

    expect(secondResponse.body.success).toBe(false);
    expect(secondResponse.body.message).toBe("Category already exists");
  });

  test("POST /api/categories should reject requester role", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test.user@bua.edu.eg",
        password: "Test123!",
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: `Requester Category ${Date.now()}`,
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You do not have permission to access this resource"
    );
  });

  test("PUT /api/categories/:id should update category as admin", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .put("/api/categories/1")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: "Technical Support",
      });

    expect(response.statusCode).toBe(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("Category updated successfully");
    expect(response.body.data.category_id).toBe(1);
    expect(response.body.data.category_name).toBe("Technical Support");
  });

  test("PUT /api/categories/:id should return 404 for non-existing category", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .put("/api/categories/99999")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: "Non Existing Category",
      });

    expect(response.statusCode).toBe(404);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Category not found");
  });

  test("PUT /api/categories/:id should return 400 when category name is missing", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .put("/api/categories/1")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: "",
      });

    expect(response.statusCode).toBe(400);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("category_name is required");
  });

  test("PUT /api/categories/:id should return 409 for duplicate category name", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: process.env.TEST_ADMIN_EMAIL,
        password: process.env.TEST_ADMIN_PASSWORD,
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const duplicateName = `Network Support ${Date.now()}`;

    const createResponse = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: duplicateName,
      });

    expect(createResponse.statusCode).toBe(201);

    const response = await request(app)
      .put("/api/categories/1")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: duplicateName,
      });

    expect(response.statusCode).toBe(409);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Category already exists");
  });

  test("PUT /api/categories/:id should reject requester role", async () => {
    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({
        email: "test.user@bua.edu.eg",
        password: "Test123!",
      });

    expect(loginResponse.statusCode).toBe(200);

    const token = loginResponse.body.data.token;

    const response = await request(app)
      .put("/api/categories/1")
      .set("Authorization", `Bearer ${token}`)
      .send({
        category_name: "Unauthorized Update",
      });

    expect(response.statusCode).toBe(403);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe(
      "You do not have permission to access this resource"
    );
  });
});