const {
  ACCOUNT_STATUS,
  isPendingApprovalStatus,
  isActiveStatus,
} = require("../src/utils/accountStatus");

describe("Account status rules", () => {
  test("uses the live PostgreSQL pending approval status value", () => {
    expect(ACCOUNT_STATUS.PENDING_APPROVAL).toBe("PENDING_APPROVAL");
    expect(isPendingApprovalStatus("PENDING_APPROVAL")).toBe(true);
    expect(isPendingApprovalStatus("PENDING")).toBe(false);
  });

  test("only ACTIVE accounts are treated as active", () => {
    expect(isActiveStatus("ACTIVE")).toBe(true);
    expect(isActiveStatus("PENDING_APPROVAL")).toBe(false);
    expect(isActiveStatus("SUSPENDED")).toBe(false);
  });
});
