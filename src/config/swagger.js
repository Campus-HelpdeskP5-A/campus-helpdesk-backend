
const productionUrl =
  process.env.API_BASE_URL ||
  "https://campus-helpdesk-api-campus-helpdesk-p5-a.vercel.app";

const openapiDocument = {
  openapi: "3.0.0",

  info: {
    title: "Campus Helpdesk API",
    version: "1.0.0",
    description:
      "REST API for the Campus Helpdesk & Maintenance Ticket System.",
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
      name: "Locations",
      description: "Campus locations",
    },
    {
      name: "Support Teams",
      description: "Support team management",
    },
    {
      name: "Tickets",
      description: "Campus helpdesk ticket management",
    },
    {
      name: "Assignments",
      description: "Ticket assignment and technician management",
    },
    {
      name: "Comments",
      description: "Ticket comments and internal notes",
    },
    {
      name: "Attachments",
      description: "Ticket attachments",
    },
    {
      name: "Ticket Events",
      description: "Ticket workflow events",
    },
    {
      name: "Status History",
      description: "Ticket status history",
    },
    {
      name: "Escalations",
      description: "Ticket escalations",
    },
    {
      name: "Work Logs",
      description: "Technician work logs",
    },
    {
      name: "SLA",
      description: "Service level agreement management",
    },
    {
      name: "Predictions",
      description: "AI-assisted ticket predictions",
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
      name: "Audit Logs",
      description: "Security and audit events",
    },
    {
      name: "Dashboard",
      description: "Management dashboards and reports",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token.",
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

      Location: {
        type: "object",
        properties: {
          location_id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
            example: "Building A",
          },
        },
      },

      SupportTeam: {
        type: "object",
        properties: {
          team_id: {
            type: "string",
            format: "uuid",
          },
          name: {
            type: "string",
            example: "IT Support Team",
          },
        },
      },

      Ticket: {
        type: "object",
        properties: {
          ticket_id: {
            type: "string",
            format: "uuid",
          },
          title: {
            type: "string",
            example: "Projector not working",
          },
          description: {
            type: "string",
            example:
              "The projector in room 204 is not displaying anything.",
          },
          status: {
            type: "string",
            example: "OPEN",
          },
          priority: {
            type: "string",
            example: "MEDIUM",
          },
        },
      },

      Assignment: {
        type: "object",
        properties: {
          assignment_id: {
            type: "string",
            format: "uuid",
          },
          ticket_id: {
            type: "string",
            format: "uuid",
          },
          technician_id: {
            type: "string",
            format: "uuid",
          },
        },
      },
    },
  },

  paths: {
    /*
     * =========================
     * AUTHENTICATION
     * =========================
     */

    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                  },
                  password: {
                    type: "string",
                  },
                  full_name: {
                    type: "string",
                  },
                  role: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
          },
          400: {
            description: "Invalid request",
          },
        },
      },
    },

    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                  },
                  password: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
          },
          401: {
            description: "Invalid credentials",
          },
        },
      },
    },

    /*
     * =========================
     * USERS
     * =========================
     */

    "/api/users": {
      get: {
        tags: ["Users"],
        summary: "Get all users",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Users retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Users"],
        summary: "Create a user",
        security: [{ bearerAuth: [] }],

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "email",
                  "password",
                  "full_name",
                  "role",
                ],
                properties: {
                  email: {
                    type: "string",
                    format: "email",
                    example: "test.technician@bua.edu.eg",
                  },
                  password: {
                    type: "string",
                    format: "password",
                    example: "Test12345!",
                  },
                  full_name: {
                    type: "string",
                    example: "Test Technician",
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
                    example: "TECHNICIAN",
                  },
                },
              },
            },
          },
        },

        responses: {
          201: {
            description: "User created successfully",
          },
          400: {
            description: "Invalid user data",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Insufficient permissions",
          },
          409: {
            description: "User already exists",
          },
          500: {
            description: "Server error",
          },
        },
      },
    },

    "/api/users/{id}": {
      get: {
        tags: ["Users"],
        summary: "Get user by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "User retrieved successfully",
          },
          404: {
            description: "User not found",
          },
        },
      },

      put: {
        tags: ["Users"],
        summary: "Update user",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "User updated successfully",
          },
        },
      },
    },

    "/api/users/{id}/status": {
      patch: {
        tags: ["Users"],
        summary: "Update user status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "User status updated successfully",
          },
        },
      },
    },

    /*
     * =========================
     * USER APPROVAL
     * =========================
     */

    "/api/users/{id}/approve": {
      patch: {
        tags: ["Users"],
        summary: "Approve a pending Technician or Manager account",
        description:
          "Only a Manager can approve a pending Technician or Manager account.",
        security: [{ bearerAuth: [] }],

        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            description: "User ID to approve",
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],

        responses: {
          200: {
            description: "User approved successfully",
          },
          400: {
            description: "User cannot be approved",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Only Managers can approve users",
          },
          404: {
            description: "User not found",
          },
          500: {
            description: "Server error",
          },
        },
      },
    },

    /*
     * =========================
     * CATEGORIES
     * =========================
     */

    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "Get all categories",
        responses: {
          200: {
            description: "Categories retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Categories"],
        summary: "Create category",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Category created successfully",
          },
        },
      },
    },

    "/api/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get category by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Category retrieved successfully",
          },
        },
      },

      put: {
        tags: ["Categories"],
        summary: "Update category",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Category updated successfully",
          },
        },
      },
    },

    /*
     * =========================
     * LOCATIONS
     * =========================
     */

    "/api/locations": {
      get: {
        tags: ["Locations"],
        summary: "Get all locations",
        responses: {
          200: {
            description: "Locations retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Locations"],
        summary: "Create location",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Location created successfully",
          },
        },
      },
    },

    "/api/locations/{id}": {
      get: {
        tags: ["Locations"],
        summary: "Get location by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Location retrieved successfully",
          },
        },
      },

      put: {
        tags: ["Locations"],
        summary: "Update location",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Location updated successfully",
          },
        },
      },
    },

    /*
     * =========================
     * SUPPORT TEAMS
     * =========================
     */

    "/api/support-teams": {
      get: {
        tags: ["Support Teams"],
        summary: "Get all support teams",
        responses: {
          200: {
            description: "Support teams retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Support Teams"],
        summary: "Create support team",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Support team created successfully",
          },
        },
      },
    },

    "/api/support-teams/{id}": {
      get: {
        tags: ["Support Teams"],
        summary: "Get support team by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Support team retrieved successfully",
          },
        },
      },

      put: {
        tags: ["Support Teams"],
        summary: "Update support team",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Support team updated successfully",
          },
        },
      },
    },

    /*
     * =========================
     * TICKETS
     * =========================
     */

    "/api/tickets": {
      get: {
        tags: ["Tickets"],
        summary: "Get tickets",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Tickets retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Tickets"],
        summary: "Create ticket",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Ticket created successfully",
          },
        },
      },
    },

    "/api/tickets/{id}": {
      get: {
        tags: ["Tickets"],
        summary: "Get ticket by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Ticket retrieved successfully",
          },
          404: {
            description: "Ticket not found",
          },
        },
      },
    },

    "/api/tickets/{id}/status": {
      patch: {
        tags: ["Tickets"],
        summary: "Update ticket status",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Ticket status updated successfully",
          },
        },
      },
    },

    /*
     * =========================
     * ASSIGNMENTS
     * =========================
     */

    "/api/assignments": {
      get: {
        tags: ["Assignments"],
        summary: "Get assignments",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Assignments retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Assignments"],
        summary: "Create assignment",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Assignment created successfully",
          },
        },
      },
    },

    "/api/assignments/{id}": {
      get: {
        tags: ["Assignments"],
        summary: "Get assignment by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Assignment retrieved successfully",
          },
        },
      },

      patch: {
        tags: ["Assignments"],
        summary: "Update assignment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Assignment updated successfully",
          },
        },
      },

      delete: {
        tags: ["Assignments"],
        summary: "Delete assignment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Assignment deleted successfully",
          },
        },
      },
    },

    /*
     * =========================
     * COMMENTS
     * =========================
     */

    "/api/comments/ticket/{ticketId}": {
      get: {
        tags: ["Comments"],
        summary: "Get comments for a ticket",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Comments retrieved successfully",
          },
        },
      },
    },

    "/api/comments/{id}": {
      get: {
        tags: ["Comments"],
        summary: "Get comment by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Comment retrieved successfully",
          },
        },
      },

      put: {
        tags: ["Comments"],
        summary: "Update comment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Comment updated successfully",
          },
        },
      },

      delete: {
        tags: ["Comments"],
        summary: "Delete comment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Comment deleted successfully",
          },
        },
      },
    },

    "/api/comments": {
      post: {
        tags: ["Comments"],
        summary: "Create comment",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Comment created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * ATTACHMENTS
     * =========================
     */

    "/api/attachments/ticket/{ticketId}": {
      get: {
        tags: ["Attachments"],
        summary: "Get ticket attachments",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Attachments retrieved successfully",
          },
        },
      },
    },

    "/api/attachments/{id}": {
      get: {
        tags: ["Attachments"],
        summary: "Get attachment by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Attachment retrieved successfully",
          },
        },
      },

      delete: {
        tags: ["Attachments"],
        summary: "Delete attachment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Attachment deleted successfully",
          },
        },
      },
    },

    "/api/attachments": {
      post: {
        tags: ["Attachments"],
        summary: "Create attachment",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Attachment created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * TICKET EVENTS
     * =========================
     */

    "/api/ticket-events/ticket/{ticketId}": {
      get: {
        tags: ["Ticket Events"],
        summary: "Get ticket events",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Ticket events retrieved successfully",
          },
        },
      },
    },

    "/api/ticket-events/{id}": {
      get: {
        tags: ["Ticket Events"],
        summary: "Get ticket event by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Ticket event retrieved successfully",
          },
        },
      },
    },

    "/api/ticket-events": {
      post: {
        tags: ["Ticket Events"],
        summary: "Create ticket event",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Ticket event created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * STATUS HISTORY
     * =========================
     */

    "/api/status-history/ticket/{ticketId}": {
      get: {
        tags: ["Status History"],
        summary: "Get ticket status history",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Status history retrieved successfully",
          },
        },
      },
    },

    "/api/status-history/{id}": {
      get: {
        tags: ["Status History"],
        summary: "Get status history by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Status history retrieved successfully",
          },
        },
      },
    },

    "/api/status-history": {
      post: {
        tags: ["Status History"],
        summary: "Create status history entry",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Status history created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * ESCALATIONS
     * =========================
     */

    "/api/escalations/ticket/{ticketId}": {
      get: {
        tags: ["Escalations"],
        summary: "Get ticket escalations",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Escalations retrieved successfully",
          },
        },
      },
    },

    "/api/escalations/{id}": {
      get: {
        tags: ["Escalations"],
        summary: "Get escalation by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Escalation retrieved successfully",
          },
        },
      },
    },

    "/api/escalations": {
      post: {
        tags: ["Escalations"],
        summary: "Create escalation",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Escalation created successfully",
          },
        },
      },
    },

    "/api/escalations/{id}/resolve": {
      patch: {
        tags: ["Escalations"],
        summary: "Resolve escalation",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Escalation resolved successfully",
          },
        },
      },
    },

    /*
     * =========================
     * WORK LOGS
     * =========================
     */

    "/api/work-logs/ticket/{ticketId}": {
      get: {
        tags: ["Work Logs"],
        summary: "Get ticket work logs",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Work logs retrieved successfully",
          },
        },
      },
    },

    "/api/work-logs/{id}": {
      get: {
        tags: ["Work Logs"],
        summary: "Get work log by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Work log retrieved successfully",
          },
        },
      },

      put: {
        tags: ["Work Logs"],
        summary: "Update work log",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Work log updated successfully",
          },
        },
      },

      delete: {
        tags: ["Work Logs"],
        summary: "Delete work log",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Work log deleted successfully",
          },
        },
      },
    },

    "/api/work-logs": {
      post: {
        tags: ["Work Logs"],
        summary: "Create work log",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Work log created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * SLA
     * =========================
     */

    "/api/sla/business-hours": {
      get: {
        tags: ["SLA"],
        summary: "Get business hours",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Business hours retrieved successfully",
          },
        },
      },

      post: {
        tags: ["SLA"],
        summary: "Create business hours",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Business hours created successfully",
          },
        },
      },
    },

    "/api/sla/business-hours/{id}": {
      get: {
        tags: ["SLA"],
        summary: "Get business hours by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Business hours retrieved successfully",
          },
        },
      },

      put: {
        tags: ["SLA"],
        summary: "Update business hours",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Business hours updated successfully",
          },
        },
      },
    },

    "/api/sla/profiles": {
      get: {
        tags: ["SLA"],
        summary: "Get SLA profiles",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "SLA profiles retrieved successfully",
          },
        },
      },

      post: {
        tags: ["SLA"],
        summary: "Create SLA profile",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "SLA profile created successfully",
          },
        },
      },
    },

    "/api/sla/profiles/{id}": {
      get: {
        tags: ["SLA"],
        summary: "Get SLA profile by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "SLA profile retrieved successfully",
          },
        },
      },

      put: {
        tags: ["SLA"],
        summary: "Update SLA profile",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "SLA profile updated successfully",
          },
        },
      },
    },

    "/api/sla/priority-matrix": {
      get: {
        tags: ["SLA"],
        summary: "Get priority matrix",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Priority matrix retrieved successfully",
          },
        },
      },

      post: {
        tags: ["SLA"],
        summary: "Create priority matrix entry",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Priority matrix entry created successfully",
          },
        },
      },
    },

    "/api/sla/priority-matrix/resolve": {
      get: {
        tags: ["SLA"],
        summary: "Resolve priority matrix",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Priority matrix resolved successfully",
          },
        },
      },
    },

    "/api/sla/priority-matrix/{id}": {
      put: {
        tags: ["SLA"],
        summary: "Update priority matrix entry",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Priority matrix updated successfully",
          },
        },
      },
    },

    /*
     * =========================
     * PREDICTIONS
     * =========================
     */

    "/api/predictions/ticket/{ticketId}": {
      get: {
        tags: ["Predictions"],
        summary: "Get predictions for a ticket",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Predictions retrieved successfully",
          },
        },
      },
    },

    "/api/predictions/{id}": {
      get: {
        tags: ["Predictions"],
        summary: "Get prediction by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Prediction retrieved successfully",
          },
        },
      },

      patch: {
        tags: ["Predictions"],
        summary: "Review prediction",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Prediction reviewed successfully",
          },
        },
      },
    },

    "/api/predictions": {
      post: {
        tags: ["Predictions"],
        summary: "Create prediction",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Prediction created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * NOTIFICATIONS
     * =========================
     */

    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Notifications retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Notifications"],
        summary: "Create notification",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Notification created successfully",
          },
        },
      },
    },

    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Notifications marked as read",
          },
        },
      },
    },

    "/api/notifications/{id}": {
      get: {
        tags: ["Notifications"],
        summary: "Get notification by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Notification retrieved successfully",
          },
        },
      },
    },

    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Notification marked as read",
          },
        },
      },
    },

    /*
     * =========================
     * FEEDBACK
     * =========================
     */

    "/api/feedback/ticket/{ticketId}": {
      get: {
        tags: ["Feedback"],
        summary: "Get feedback for a ticket",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "ticketId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Feedback retrieved successfully",
          },
        },
      },
    },

    "/api/feedback/{id}": {
      get: {
        tags: ["Feedback"],
        summary: "Get feedback by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Feedback retrieved successfully",
          },
        },
      },

      put: {
        tags: ["Feedback"],
        summary: "Update feedback",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Feedback updated successfully",
          },
        },
      },

      delete: {
        tags: ["Feedback"],
        summary: "Delete feedback",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Feedback deleted successfully",
          },
        },
      },
    },

    "/api/feedback": {
      post: {
        tags: ["Feedback"],
        summary: "Create feedback",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Feedback created successfully",
          },
        },
      },
    },

    /*
     * =========================
     * AUDIT LOGS
     * =========================
     */

    "/api/audit-logs": {
      get: {
        tags: ["Audit Logs"],
        summary: "Get audit logs",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Audit logs retrieved successfully",
          },
        },
      },

      post: {
        tags: ["Audit Logs"],
        summary: "Create audit log",
        security: [{ bearerAuth: [] }],
        responses: {
          201: {
            description: "Audit log created successfully",
          },
        },
      },
    },

    "/api/audit-logs/{id}": {
      get: {
        tags: ["Audit Logs"],
        summary: "Get audit log by ID",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "string",
              format: "uuid",
            },
          },
        ],
        responses: {
          200: {
            description: "Audit log retrieved successfully",
          },
        },
      },
    },

    /*
     * =========================
     * DASHBOARD
     * =========================
     */

    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get manager dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Manager dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Manager role required",
          },
        },
      },
    },

    "/api/dashboard/manager": {
      get: {
        tags: ["Dashboard"],
        summary: "Get manager dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Manager dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Manager role required",
          },
        },
      },
    },

    "/api/dashboard/agent": {
      get: {
        tags: ["Dashboard"],
        summary: "Get agent dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Agent dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Agent role required",
          },
        },
      },
    },

    "/api/dashboard/technician": {
      get: {
        tags: ["Dashboard"],
        summary: "Get technician dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Technician dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Technician role required",
          },
        },
      },
    },

    "/api/dashboard/team": {
      get: {
        tags: ["Dashboard"],
        summary: "Get team dashboard data (compatibility route)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Team dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Manager, Agent, or Technician role required",
          },
        },
      },
    },

    "/api/dashboard/reporter": {
      get: {
        tags: ["Dashboard"],
        summary: "Get reporter dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Reporter dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Reporter role required",
          },
        },
      },
    },

    "/api/dashboard/auditor": {
      get: {
        tags: ["Dashboard"],
        summary: "Get auditor dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Auditor dashboard data retrieved successfully",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Auditor role required",
          },
        },
      },
    },
  },
};

module.exports = openapiDocument;

