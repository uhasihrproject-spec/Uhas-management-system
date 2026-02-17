export default function SecuritySettings() {
  return (
    <>
      <h2 className="text-lg font-semibold text-neutral-900">
        Security
      </h2>

      <p className="mt-2 text-sm text-neutral-600">
        Manage your account security settings.
      </p>

      <div className="mt-6 space-y-6">
        
        <div className="rounded-2xl border border-neutral-200 p-4">
          <h3 className="font-medium text-neutral-900">
            Change Password
          </h3>

          <p className="mt-1 text-sm text-neutral-600">
            Update your account password regularly for security.
          </p>

          <button className="mt-4 rounded-2xl bg-emerald-100 text-black px-4 py-2 text-sm hover:brightness-95">
            Change Password
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200 p-4">
          <h3 className="font-medium text-neutral-900">
            Two-Factor Authentication
          </h3>

          <p className="mt-1 text-sm text-neutral-600">
            Add an extra layer of protection to your account.
          </p>

          <button className="mt-4 rounded-2xl border border-neutral-200 px-4 py-2 text-sm hover:bg-neutral-50">
            Enable 2FA
          </button>
        </div>

      </div>
    </>
  );
}
