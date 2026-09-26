
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
            example: "NEW",
            enum: [
              "NEW",
              "TRIAGED",
              "ASSIGNED",
              "IN_PROGRESS",
              "WAITING",
              "RESOLVED",
              "REOPENED",
              "CLOSED",
            ],
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "category_id",
                  "location_id",
                  "title",
                  "description",
                  "impact",
                  "urgency",
                ],
                properties: {
                  category_id: {
                    type: "string",
                    format: "uuid",
                  },
                  location_id: {
                    type: "string",
                    format: "uuid",
                  },
                  asset_id: {
                    type: "string",
                    format: "uuid",
                    nullable: true,
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
                  impact: {
                    type: "string",
                    enum: ["LOW", "MEDIUM", "HIGH"],
                  },
                  urgency: {
                    type: "string",
                    enum: ["LOW", "MEDIUM", "HIGH"],
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: "Ticket created successfully",
          },
          400: {
            description: "Invalid request",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Only reporters can create tickets",
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
        description:
          "Update the status of a ticket according to the allowed lifecycle transitions.",
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

        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: {
                  status: {
                    type: "string",
                    enum: [
                      "NEW",
                      "TRIAGED",
                      "ASSIGNED",
                      "IN_PROGRESS",
                      "WAITING",
                      "RESOLVED",
                      "REOPENED",
                      "CLOSED",
                    ],
                  },
                  reason: {
                    type: "string",
                    description:
                      "Optional reason for the status change.",
                  },
                },
              },
              example: {
                status: "TRIAGED",
                reason: "Ticket triaged by support agent",
              },
            },
          },
        },

        responses: {
          200: {
            description: "Ticket status updated successfully",
          },
          400: {
            description: "Invalid status value or transition",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Not authorized to update ticket status",
          },
          404: {
            description: "Ticket not found",
          },
          409: {
            description: "Invalid ticket status transition",
          },
        },
      },
    },

    "/api/tickets/{id}/triage": {
  patch: {
    tags: ["Tickets"],
    summary: "Update ticket category and priority",
    description:
      "Allows an Agent to update the category and/or priority of an existing ticket during triage.",
    security: [{ bearerAuth: [] }],

    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "Ticket ID",
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              category_id: {
                type: "string",
                format: "uuid",
                description: "Active category ID.",
              },

              priority: {
                type: "string",
                enum: [
                  "LOW",
                  "MEDIUM",
                  "HIGH",
                  "CRITICAL",
                ],
                description: "Ticket priority.",
              },
            },
          },

          example: {
            category_id:
              "20000000-0000-0000-0000-000000000001",
            priority: "HIGH",
          },
        },
      },
    },

    responses: {
      200: {
        description:
          "Ticket triage updated successfully",
      },
      400: {
        description:
          "Invalid category or priority",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "Only agents can update ticket category or priority",
      },
      404: {
        description:
          "Ticket or category not found",
      },
      500: {
        description:
          "Failed to update ticket triage",
      },
    },
  },
},

    "/api/tickets/{id}/confirm-resolution": {
      post: {
        tags: ["Tickets"],
        summary: "Confirm a resolved ticket",
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
            description: "Resolution confirmed and ticket closed",
          },
          401: {
            description: "Authentication required",
          },
          403: {
            description: "Only the reporter can confirm resolution",
          },
          404: {
            description: "Ticket not found",
          },
        },
      },
    },

    "/api/tickets/{id}/reopen": {
      post: {
        tags: ["Tickets"],
        summary: "Reopen a recently resolved ticket",
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
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  reason: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Ticket reopened successfully",
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
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  ticket_id: {
                    type: "string",
                    format: "uuid",
                  },
                  body: {
                    type: "string",
                  },
                },
              },
            },
          },
        },
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

    "/api/attachments": {
  post: {
    tags: ["Attachments"],
    summary: "Create attachment metadata",
    description:
      "Create attachment metadata for an existing ticket. The actual file upload and storage are handled separately.",
    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: [
              "ticket_id",
              "file_uuid",
              "file_name",
              "file_size",
              "storage_path",
            ],
            properties: {
              ticket_id: {
                type: "string",
                format: "uuid",
                description: "Ticket ID",
                example:
                  "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
              },

              file_uuid: {
                type: "string",
                format: "uuid",
                description: "Unique UUID of the uploaded file.",
                example:
                  "550e8400-e29b-41d4-a716-446655440000",
              },

              file_name: {
                type: "string",
                description: "Original file name.",
                example: "screenshot.png",
              },

              mime_type: {
                type: "string",
                nullable: true,
                description: "MIME type of the file.",
                example: "image/png",
              },

              file_size: {
                type: "integer",
                minimum: 0,
                description: "File size in bytes.",
                example: 245678,
              },

              storage_path: {
                type: "string",
                description:
                  "Path where the file is stored by the storage layer.",
                example:
                  "tickets/123/screenshot.png",
              },
            },
          },

          example: {
            ticket_id:
              "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
            file_uuid:
              "550e8400-e29b-41d4-a716-446655440000",
            file_name: "screenshot.png",
            mime_type: "image/png",
            file_size: 245678,
            storage_path:
              "tickets/123/screenshot.png",
          },
        },
      },
    },

    responses: {
      201: {
        description: "Attachment created successfully",
      },
      400: {
        description: "Invalid attachment data",
      },
      401: {
        description: "Authentication required",
      },
      403: {
        description: "Not authorized to create attachment",
      },
      404: {
        description: "Ticket not found",
      },
      409: {
        description: "Attachment already exists",
      },
      500: {
        description: "Server error",
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
    description: "Assign a technician to a ticket.",
    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["ticket_id", "assigned_to"],
            properties: {
              ticket_id: {
                type: "string",
                format: "uuid",
                description: "Ticket ID",
                example:
                  "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
              },

              assigned_to: {
                type: "string",
                format: "uuid",
                description: "Technician user ID",
                example:
                  "00000000-0000-0000-0000-000000000005",
              },

              assigned_team_id: {
                type: "string",
                format: "uuid",
                nullable: true,
                description:
                  "Optional support team ID. At least one of assigned_to or assigned_team_id is required.",
                example:
                  "00000000-0000-0000-0000-000000000001",
              },
            },
          },

          example: {
            ticket_id:
              "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
            assigned_to:
              "00000000-0000-0000-0000-000000000005",
            assigned_team_id: null,
          },
        },
      },
    },

    responses: {
      201: {
        description: "Assignment created successfully",
      },
      400: {
        description: "Invalid assignment data",
      },
      401: {
        description: "Authentication required",
      },
      403: {
        description: "Not authorized to create assignment",
      },
      404: {
        description: "Ticket or technician not found",
      },
      409: {
        description: "Assignment conflict",
      },
      500: {
        description: "Server error",
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
    description: "Create a work log for a ticket.",
    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["ticket_id", "time_spent_minutes"],
            properties: {
              ticket_id: {
                type: "string",
                format: "uuid",
                description: "Ticket ID",
                example:
                  "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
              },

              time_spent_minutes: {
                type: "integer",
                minimum: 1,
                description:
                  "Time spent working on the ticket in minutes.",
                example: 60,
              },

              note: {
                type: "string",
                nullable: true,
                description:
                  "Work performed or technician notes.",
                example:
                  "Diagnosed and worked on the reported issue.",
              },
            },
          },

          example: {
            ticket_id:
              "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
            time_spent_minutes: 60,
            note:
              "Diagnosed and worked on the reported issue.",
          },
        },
      },
    },

    responses: {
      201: {
        description: "Work log created successfully",
      },
      400: {
        description: "Invalid work log data",
      },
      401: {
        description: "Authentication required",
      },
      403: {
        description: "Not authorized to create work log",
      },
      404: {
        description: "Ticket not found",
      },
      500: {
        description: "Server error",
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

    "/api/sla/evaluate": {
      post: {
        tags: ["SLA"],
        summary: "Evaluate active SLA executions",
        description:
          "Runs one idempotent SLA monitoring cycle. Manager authorization is required.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "SLA evaluation completed successfully",
          },
          403: {
            description: "Manager authorization required",
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
    description:
      "Resolve the configured priority and SLA profile using impact and urgency.",
    security: [{ bearerAuth: [] }],

    parameters: [
      {
        name: "impact",
        in: "query",
        required: true,
        description: "Ticket impact level.",
        schema: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        example: "HIGH",
      },
      {
        name: "urgency",
        in: "query",
        required: true,
        description: "Ticket urgency level.",
        schema: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        example: "HIGH",
      },
    ],

    responses: {
      200: {
        description: "Priority matrix resolved successfully",
      },
      400: {
        description:
          "Impact and urgency are required or invalid.",
      },
      404: {
        description:
          "No matching active priority matrix entry found.",
      },
      500: {
        description: "Server error",
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
            description:
              "Manager dashboard data retrieved successfully",
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
            description:
              "Manager dashboard data retrieved successfully",
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
            description:
              "Technician dashboard data retrieved successfully",
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
        summary: "Get team dashboard data",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Team dashboard data retrieved successfully",
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