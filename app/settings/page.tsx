import { PageHeader } from "@/components/ui";

export default function SettingsPage() {
  return (
    <div className="p-8 max-w-2xl">
      <PageHeader title="Settings" subtitle="Platform configuration" />
      <div className="bg-stone-100 border border-stone-200 rounded-lg p-6 text-center">
        <p className="text-sm text-stone-500 font-medium">Settings coming in a later phase</p>
      </div>
    </div>
  );
}
