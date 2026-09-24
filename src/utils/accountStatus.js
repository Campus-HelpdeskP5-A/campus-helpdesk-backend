const ACCOUNT_STATUS = {
  PENDING_APPROVAL: "PENDING_APPROVAL",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
  SUSPENDED: "SUSPENDED",
  DISABLED: "DISABLED",
};

const isPendingApprovalStatus = (status) => status === ACCOUNT_STATUS.PENDING_APPROVAL;
const isActiveStatus = (status) => status === ACCOUNT_STATUS.ACTIVE;

module.exports = {
  ACCOUNT_STATUS,
  isPendingApprovalStatus,
  isActiveStatus,
};
