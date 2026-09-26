
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
     security: [{ bearerAuth: [] }],
     responses: {
       200: {
         description: "Categories retrieved successfully",
       },
       401: {
         description: "Authentication required",
       },
       500: {
         description: "Server error",
       },
     },
   },

   post: {
     tags: ["Categories"],
     summary: "Create category",
     security: [{ bearerAuth: [] }],

     requestBody: {
       required: true,
       content: {
         "application/json": {
           schema: {
             type: "object",
             required: ["name"],
             properties: {
               name: {
                 type: "string",
                 description: "Category name.",
                 example: "Software",
               },
               description: {
                 type: "string",
                 nullable: true,
                 description: "Optional category description.",
                 example: "Software and application related issues.",
               },
               is_active: {
                 type: "boolean",
                 description: "Whether the category is active.",
                 example: true,
               },
             },
           },

           example: {
             name: "Software",
             description: "Software and application related issues.",
             is_active: true,
           },
         },
       },
     },

     responses: {
       201: {
         description: "Category created successfully",
       },
       400: {
         description: "Invalid category data",
       },
       401: {
         description: "Authentication required",
       },
       409: {
         description: "Category already exists",
       },
       500: {
         description: "Server error",
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
         description: "Category UUID.",
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
       404: {
         description: "Category not found",
       },
       500: {
         description: "Server error",
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
         description: "Category UUID.",
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
               name: {
                 type: "string",
                 description: "Updated category name.",
                 example: "Hardware",
               },
               description: {
                 type: "string",
                 nullable: true,
                 description: "Updated category description.",
                 example: "Computer hardware related issues.",
               },
               is_active: {
                 type: "boolean",
                 description: "Whether the category is active.",
                 example: true,
               },
             },
           },

           example: {
             name: "Hardware",
             description: "Computer hardware related issues.",
             is_active: true,
           },
         },
       },
     },

     responses: {
       200: {
         description: "Category updated successfully",
       },
       400: {
         description: "Invalid category data",
       },
       401: {
         description: "Authentication required",
       },
       404: {
         description: "Category not found",
       },
       409: {
         description: "Category already exists",
       },
       500: {
         description: "Server error",
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
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Locations retrieved successfully",
      },
      401: {
        description: "Authentication required",
      },
      500: {
        description: "Server error",
      },
    },
  },

  post: {
    tags: ["Locations"],
    summary: "Create location",
    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["building_name", "room_name"],
            properties: {
              building_name: {
                type: "string",
                description: "Building name.",
                example: "AI Building",
              },

              room_name: {
                type: "string",
                description: "Room or lab name.",
                example: "LAB-101",
              },

              floor: {
                type: "string",
                nullable: true,
                description: "Floor where the location is located.",
                example: "1",
              },

              description: {
                type: "string",
                nullable: true,
                description: "Optional location description.",
                example: "Artificial Intelligence laboratory.",
              },

              is_active: {
                type: "boolean",
                description: "Whether the location is active.",
                example: true,
              },
            },
          },

          example: {
            building_name: "AI Building",
            room_name: "LAB-101",
            floor: "1",
            description: "Artificial Intelligence laboratory.",
            is_active: true,
          },
        },
      },
    },

    responses: {
      201: {
        description: "Location created successfully",
      },
      400: {
        description: "Invalid location data",
      },
      401: {
        description: "Authentication required",
      },
      409: {
        description: "Location already exists",
      },
      500: {
        description: "Server error",
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
        description: "Location UUID.",
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
      404: {
        description: "Location not found",
      },
      500: {
        description: "Server error",
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
        description: "Location UUID.",
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
              building_name: {
                type: "string",
                description: "Updated building name.",
                example: "Engineering Building",
              },

              room_name: {
                type: "string",
                description: "Updated room or lab name.",
                example: "LAB-201",
              },

              floor: {
                type: "string",
                nullable: true,
                description: "Updated floor.",
                example: "2",
              },

              description: {
                type: "string",
                nullable: true,
                description: "Updated location description.",
                example: "Engineering computer laboratory.",
              },

              is_active: {
                type: "boolean",
                description: "Whether the location is active.",
                example: true,
              },
            },
          },

          example: {
            building_name: "Engineering Building",
            room_name: "LAB-201",
            floor: "2",
            description: "Engineering computer laboratory.",
            is_active: true,
          },
        },
      },
    },

    responses: {
      200: {
        description: "Location updated successfully",
      },
      400: {
        description: "Invalid location data",
      },
      401: {
        description: "Authentication required",
      },
      404: {
        description: "Location not found",
      },
      409: {
        description: "Location already exists",
      },
      500: {
        description: "Server error",
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
    security: [{ bearerAuth: [] }],
    responses: {
      200: {
        description: "Support teams retrieved successfully",
      },
      401: {
        description: "Authentication required",
      },
      500: {
        description: "Server error",
      },
    },
  },

  post: {
    tags: ["Support Teams"],
    summary: "Create support team",
    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["name"],
            properties: {
              name: {
                type: "string",
                description: "Support team name.",
                example: "IT Support",
              },

              description: {
                type: "string",
                nullable: true,
                description: "Optional support team description.",
                example:
                  "Team responsible for IT and software related issues.",
              },

              is_active: {
                type: "boolean",
                description: "Whether the support team is active.",
                example: true,
              },
            },
          },

          example: {
            name: "IT Support",
            description:
              "Team responsible for IT and software related issues.",
            is_active: true,
          },
        },
      },
    },

    responses: {
      201: {
        description: "Support team created successfully",
      },
      400: {
        description: "Invalid support team data",
      },
      401: {
        description: "Authentication required",
      },
      409: {
        description: "Support team already exists",
      },
      500: {
        description: "Server error",
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
        description: "Support team UUID.",
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
      404: {
        description: "Support team not found",
      },
      500: {
        description: "Server error",
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
        description: "Support team UUID.",
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
              name: {
                type: "string",
                description: "Updated support team name.",
                example: "Network Team",
              },

              description: {
                type: "string",
                nullable: true,
                description: "Updated support team description.",
                example:
                  "Team responsible for network and connectivity issues.",
              },

              is_active: {
                type: "boolean",
                description: "Whether the support team is active.",
                example: true,
              },
            },
          },

          example: {
            name: "Network Team",
            description:
              "Team responsible for network and connectivity issues.",
            is_active: true,
          },
        },
      },
    },

    responses: {
      200: {
        description: "Support team updated successfully",
      },
      400: {
        description: "Invalid support team data",
      },
      401: {
        description: "Authentication required",
      },
      404: {
        description: "Support team not found",
      },
      409: {
        description: "Support team already exists",
      },
      500: {
        description: "Server error",
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
      401: {
        description: "Authentication required",
      },
      500: {
        description: "Server error",
      },
    },
  },

  post: {
    tags: ["Tickets"],
    summary: "Create ticket",
    description:
      "Create a new support ticket. Only users with the REPORTER role can create tickets.",

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
                description: "Category assigned to the ticket.",
                example:
                  "20000000-0000-0000-0000-000000000001",
              },

              location_id: {
                type: "string",
                format: "uuid",
                description: "Location where the issue occurred.",
                example:
                  "30000000-0000-0000-0000-000000000001",
              },

              asset_id: {
                type: "string",
                format: "uuid",
                nullable: true,
                description:
                  "Optional asset UUID. Can be null because assets are not currently managed through a dedicated API.",
                example: null,
              },

              title: {
                type: "string",
                description: "Short title describing the issue.",
                example: "Projector not working",
              },

              description: {
                type: "string",
                description: "Detailed description of the issue.",
                example:
                  "The projector in room 204 is not displaying anything.",
              },

              impact: {
                type: "string",
                enum: ["LOW", "MEDIUM", "HIGH"],
                description:
                  "Business or operational impact of the issue.",
                example: "HIGH",
              },

              urgency: {
                type: "string",
                enum: ["LOW", "MEDIUM", "HIGH"],
                description:
                  "How quickly the issue needs to be addressed.",
                example: "HIGH",
              },
            },
          },

          example: {
            category_id:
              "20000000-0000-0000-0000-000000000001",

            location_id:
              "30000000-0000-0000-0000-000000000001",

            asset_id: null,

            title: "Projector not working",

            description:
              "The projector in room 204 is not displaying anything.",

            impact: "HIGH",

            urgency: "HIGH",
          },
        },
      },
    },

    responses: {
      201: {
        description: "Ticket created successfully",
      },
      400: {
        description:
          "Invalid request, category, location, impact, or urgency",
      },
      401: {
        description: "Authentication required",
      },
      403: {
        description: "Only reporters can create tickets",
      },
      404: {
        description:
          "Category or location not found",
      },
      500: {
        description: "Server error",
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
        description: "Ticket UUID.",
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
      400: {
        description: "Invalid ticket ID",
      },
      401: {
        description: "Authentication required",
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
        description: "Ticket UUID.",
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
                description: "New ticket status.",
                example: "TRIAGED",
              },

              reason: {
                type: "string",
                nullable: true,
                description:
                  "Optional reason for the status change.",
                example:
                  "Ticket triaged by support agent",
              },
            },
          },

          example: {
            status: "TRIAGED",
            reason:
              "Ticket triaged by support agent",
          },
        },
      },
    },

    responses: {
      200: {
        description:
          "Ticket status updated successfully",
      },
      400: {
        description:
          "Invalid status value or transition",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "Not authorized to update ticket status",
      },
      404: {
        description:
          "Ticket not found",
      },
      409: {
        description:
          "Invalid ticket status transition",
      },
      500: {
        description:
          "Server error",
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
        description: "Ticket UUID.",
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
                description:
                  "Active category ID.",
                example:
                  "20000000-0000-0000-0000-000000000004",
              },

              priority: {
                type: "string",
                enum: [
                  "LOW",
                  "MEDIUM",
                  "HIGH",
                  "CRITICAL",
                ],
                description:
                  "Ticket priority.",
                example: "HIGH",
              },
            },

            minProperties: 1,
          },

          example: {
            category_id:
              "20000000-0000-0000-0000-000000000004",
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

    description:
      "Allows the reporter to confirm that the ticket has been resolved and close the ticket.",

    security: [{ bearerAuth: [] }],

    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "Ticket UUID.",
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],

    responses: {
      200: {
        description:
          "Resolution confirmed and ticket closed",
      },
      400: {
        description:
          "Ticket is not in a resolvable state",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "Only the reporter can confirm resolution",
      },
      404: {
        description:
          "Ticket not found",
      },
      500: {
        description:
          "Server error",
      },
    },
  },
},

"/api/tickets/{id}/reopen": {
  post: {
    tags: ["Tickets"],
    summary: "Reopen a recently resolved ticket",

    description:
      "Allows the reporter to reopen a recently resolved or closed ticket according to the business rules.",

    security: [{ bearerAuth: [] }],

    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "Ticket UUID.",
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],

    requestBody: {
      required: false,

      content: {
        "application/json": {
          schema: {
            type: "object",

            properties: {
              reason: {
                type: "string",
                description:
                  "Reason for reopening the ticket.",
                example:
                  "The issue is still occurring after resolution.",
              },
            },
          },

          example: {
            reason:
              "The issue is still occurring after resolution.",
          },
        },
      },
    },

    responses: {
      200: {
        description:
          "Ticket reopened successfully",
      },
      400: {
        description:
          "Ticket cannot be reopened",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "Only the reporter can reopen the ticket",
      },
      404: {
        description:
          "Ticket not found",
      },
      500: {
        description:
          "Server error",
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
    summary: "Get all assignments",
    security: [{ bearerAuth: [] }],

    responses: {
      200: {
        description: "Assignments retrieved successfully",
      },
      401: {
        description: "Authentication required",
      },
      500: {
        description: "Server error",
      },
    },
  },

  post: {
    tags: ["Assignments"],
    summary: "Create assignment",

    description:
      "Assign a technician to a ticket. The ticket must be in TRIAGED status before it can be assigned.",

    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,

      content: {
        "application/json": {
          schema: {
            type: "object",

            required: [
              "ticket_id",
              "technician_id",
            ],

            properties: {
              ticket_id: {
                type: "string",
                format: "uuid",
                description:
                  "UUID of the ticket to assign.",
                example:
                  "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
              },

              technician_id: {
                type: "string",
                format: "uuid",
                description:
                  "UUID of the technician who will be assigned.",
                example:
                  "00000000-0000-0000-0000-000000000006",
              },

              notes: {
                type: "string",
                nullable: true,
                description:
                  "Optional assignment notes.",
                example:
                  "Assign to technician for hardware inspection.",
              },
            },
          },

          example: {
            ticket_id:
              "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",

            technician_id:
              "00000000-0000-0000-0000-000000000006",

            notes:
              "Assign to technician for hardware inspection.",
          },
        },
      },
    },

    responses: {
      201: {
        description:
          "Assignment created successfully",
      },
      400: {
        description:
          "Invalid assignment data or ticket is not ready for assignment",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "User is not authorized to create assignments",
      },
      404: {
        description:
          "Ticket or technician not found",
      },
      409: {
        description:
          "Ticket cannot be assigned in its current state",
      },
      500: {
        description:
          "Server error",
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
        description: "Assignment UUID.",
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],

    responses: {
      200: {
        description:
          "Assignment retrieved successfully",
      },
      401: {
        description:
          "Authentication required",
      },
      404: {
        description:
          "Assignment not found",
      },
      500: {
        description:
          "Server error",
      },
    },
  },

  patch: {
    tags: ["Assignments"],
    summary: "Update assignment",

    description:
      "Update an existing ticket assignment.",

    security: [{ bearerAuth: [] }],

    parameters: [
      {
        name: "id",
        in: "path",
        required: true,
        description: "Assignment UUID.",
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
              technician_id: {
                type: "string",
                format: "uuid",
                description:
                  "UUID of the new technician.",
                example:
                  "00000000-0000-0000-000000000007",
              },

              notes: {
                type: "string",
                nullable: true,
                description:
                  "Updated assignment notes.",
                example:
                  "Reassigned for networking expertise.",
              },
            },

            minProperties: 1,
          },

          example: {
            technician_id:
              "00000000-0000-0000-0000-000000000007",

            notes:
              "Reassigned for networking expertise.",
          },
        },
      },
    },

    responses: {
      200: {
        description:
          "Assignment updated successfully",
      },
      400: {
        description:
          "Invalid assignment data",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "User is not authorized to update assignments",
      },
      404: {
        description:
          "Assignment or technician not found",
      },
      500: {
        description:
          "Server error",
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
        description: "Assignment UUID.",
        schema: {
          type: "string",
          format: "uuid",
        },
      },
    ],

    responses: {
      200: {
        description:
          "Assignment deleted successfully",
      },
      401: {
        description:
          "Authentication required",
      },
      403: {
        description:
          "User is not authorized to delete assignments",
      },
      404: {
        description:
          "Assignment not found",
      },
      500: {
        description:
          "Server error",
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
    description:
      "Create an AI-assisted prediction for an existing ticket. Only Agents, Technicians, and Managers can create predictions.",
    security: [{ bearerAuth: [] }],

    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: [
              "ticket_id",
              "model_version_id",
              "prediction_type",
              "predicted_value",
            ],
            properties: {
              ticket_id: {
                type: "string",
                format: "uuid",
                description: "Ticket ID.",
                example:
                  "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
              },

              model_version_id: {
                type: "string",
                format: "uuid",
                description:
                  "Active AI model version ID.",
                example:
                  "70000000-0000-0000-0000-000000000001",
              },

              prediction_type: {
                type: "string",
                description:
                  "Type of prediction generated by the AI model.",
                example: "PRIORITY",
              },

              predicted_value: {
                type: "string",
                description:
                  "Predicted value returned by the AI model.",
                example: "HIGH",
              },

              confidence: {
                type: "number",
                format: "float",
                minimum: 0,
                maximum: 1,
                nullable: true,
                description:
                  "Model confidence between 0 and 1.",
                example: 0.92,
              },

              explanation: {
                type: "string",
                nullable: true,
                description:
                  "Explanation for the prediction.",
                example:
                  "The ticket description and urgency indicate a high priority issue.",
              },
            },
          },

          example: {
            ticket_id:
              "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
            model_version_id:
              "70000000-0000-0000-0000-000000000001",
            prediction_type: "PRIORITY",
            predicted_value: "HIGH",
            confidence: 0.92,
            explanation:
              "The ticket description and urgency indicate a high priority issue.",
          },
        },
      },
    },

    responses: {
      201: {
        description: "Prediction created successfully",
      },
      400: {
        description: "Invalid prediction data",
      },
      401: {
        description: "Authentication required",
      },
      403: {
        description:
          "Only Agents, Technicians, and Managers can create predictions",
      },
      404: {
        description:
          "Ticket or AI model version not found",
      },
      500: {
        description: "Server error",
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
  description:
    "Create a notification for an active user. Ticket and related user are optional.",
  security: [{ bearerAuth: [] }],

  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: [
            "recipient_user_id",
            "notification_type",
            "title",
            "body",
          ],
          properties: {
            recipient_user_id: {
              type: "string",
              format: "uuid",
              description: "User who will receive the notification.",
              example:
                "00000000-0000-0000-0000-000000000008",
            },

            ticket_id: {
              type: "string",
              format: "uuid",
              nullable: true,
              description:
                "Optional ticket associated with the notification.",
              example:
                "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
            },

            related_user_id: {
              type: "string",
              format: "uuid",
              nullable: true,
              description:
                "Optional user related to the notification.",
              example:
                "00000000-0000-0000-0000-000000000005",
            },

            notification_type: {
              type: "string",
              description: "Type of notification.",
              example: "TICKET_ASSIGNED",
            },

            title: {
              type: "string",
              description: "Notification title.",
              example: "Ticket assigned",
            },

            body: {
              type: "string",
              description: "Notification message.",
              example:
                "Ticket HLP-0027 has been assigned to you.",
            },
          },
        },

        example: {
          recipient_user_id:
            "00000000-0000-0000-0000-000000000008",
          ticket_id:
            "d68c8dcb-ffdc-513b-f84c-7e8cbdaa305f",
          related_user_id:
            "00000000-0000-0000-0000-000000000005",
          notification_type: "TICKET_ASSIGNED",
          title: "Ticket assigned",
          body:
            "Ticket HLP-0027 has been assigned to you.",
        },
      },
    },
  },

  responses: {
    201: {
      description: "Notification created successfully",
    },
    400: {
      description:
        "Required fields are missing or recipient user is inactive",
    },
    401: {
      description: "Authentication required",
    },
    404: {
      description:
        "Recipient, ticket, or related user not found",
    },
    500: {
      description: "Server error",
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
},};

module.exports = openapiDocument;