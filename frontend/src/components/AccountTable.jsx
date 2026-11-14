export default function AccountTable({ accounts, selectedId, onSelect }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Bank account</th>
            <th>Entity</th>
            <th>Bank</th>
            <th>Currency</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {accounts.map((account) => (
            <tr
              key={account.id}
              className={selectedId === account.id ? "selected-row" : ""}
              onClick={() => onSelect(account.id)}
            >
              <td>
                <strong>{account.accountNumberMasked || account.id}</strong>
              </td>
              <td>{account.entity?.name || account.entityId || "—"}</td>
              <td>{account.bankName || "—"}</td>
              <td>{account.currency || "—"}</td>
              <td>
                <span className="status-pill">
                  {account.status || "ACTIVE"}
                </span>
              </td>
            </tr>
          ))}

          {accounts.length === 0 && (
            <tr>
              <td colSpan="5" className="empty-cell">
                No bank accounts found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}