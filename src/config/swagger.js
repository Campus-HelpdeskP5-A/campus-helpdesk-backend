
const swaggerJsdoc = require("swagger-jsdoc");

const productionUrl =
  process.env.API_BASE_URL ||
  "https://campus-helpdesk-api-campus-helpdesk-p5-a.vercel.app";

const options = {
  definition: {
    openapi: "3.0.0",

    info: {
      title: "Campus Helpdesk API",
      version: "1.0.0",
      description:
        "REST API for the Campus Helpdesk & Maintenance Ticket System. " +
        "The API provides authentication, role-based access control, " +
        "ticket management, workflow, assignments, comments, SLA management, " +
        "AI-assisted ticket classification, notifications, feedback, and auditing.",
    },

    servers: [
      {
        url: productionUrl,
        description: "Production API",
      },
      {
        url: "http://localhost:5000",
        description: "Local Development API",
      },
    ],

    tags: [
      {
        name: "Authentication",
        description: "User authentication and JWT token management",
      },
      {
        name: "Users",
        description: "User management",
      },
      {
        name: "Categories",
        description: "Ticket category management",
      },
      {
        name: "Tickets",
        description: "Campus helpdesk ticket management",
      },
      {
        name: "Comments",
        description: "Ticket comments and internal notes",
      },
      {
        name: "Assignments",
        description: "Ticket assignment and technician management",
      },
      {
        name: "Attachments",
        description: "Ticket attachments",
      },
      {
        name: "Locations",
        description: "Campus locations",
      },
      {
        name: "Support Teams",
        description: "Support team management",
      },
      {
        name: "Workflow",
        description: "Ticket status and workflow events",
      },
      {
        name: "SLA",
        description: "Service level agreement management",
      },
      {
        name: "AI",
        description: "AI-assisted ticket predictions and model versions",
      },
      {
        name: "Notifications",
        description: "User notifications",
      },
      {
        name: "Feedback",
        description: "Ticket feedback",
      },
      {
        name: "Dashboard",
        description: "Management dashboards and reports",
      },
      {
        name: "Audit Logs",
        description: "Security and audit events",
      },
    ],

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description:
            "Enter your JWT token without the Bearer prefix.",
        },
      },

      schemas: {
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            message: {
              type: "string",
              example: "Something went wrong",
            },
          },
        },

        User: {
          type: "object",
          properties: {
            user_id: {
              type: "string",
              format: "uuid",
              example: "00000000-0000-0000-0000-000000000001",
            },
            email: {
              type: "string",
              format: "email",
              example: "student@bua.edu.eg",
            },
            full_name: {
              type: "string",
              example: "BUA Student",
            },
            role: {
              type: "string",
              enum: [
                "REPORTER",
                "AGENT",
                "TECHNICIAN",
                "MANAGER",
                "AUDITOR",
              ],
              example: "REPORTER",
            },
            is_active: {
              type: "boolean",
              example: true,
            },
          },
        },

        Category: {
          type: "object",
          properties: {
            category_id: {
              type: "string",
              format: "uuid",
            },
            name: {
              type: "string",
              example: "IT Support",
            },
            description: {
              type: "string",
              example: "Technical and IT-related issues",
            },
          },
        },
      },
    },
  },

   apis: [
  "./src/routes/*.js",
  "./src/app.js",
],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;