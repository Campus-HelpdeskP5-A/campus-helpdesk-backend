const writeAuditLog = async ({
  client,
  actorUserId,
  action,
  entityType,
  entityId,
  oldValues = null,
  newValues = null,
  ipAddress = null,
}) => {
  const executor = client;

  await executor.query(
    `
    INSERT INTO audit_logs (
      actor_user_id,
      action,
      entity_type,
      entity_id,
      old_values,
      new_values,
      ip_address
    )
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
    `,
    [
      actorUserId,
      action,
      entityType,
      entityId,
      oldValues ? JSON.stringify(oldValues) : null,
      newValues ? JSON.stringify(newValues) : null,
      ipAddress,
    ]
  );
};

module.exports = {
  writeAuditLog,
};
