import packageInfo from '../../../package.json';

export function SettingsAbout() {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-8 text-center">
          <img
            src="/icons/lychee_diary_icon_flat.svg"
            alt="荔枝日记"
            className="w-20 h-20 mx-auto mb-3 rounded-2xl"
          />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Litchi Journal / 荔枝日记</h2>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">版本 {packageInfo.version}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 leading-relaxed">
            与 Obsidian Vault 集成的日记记录工具。<br />
            支持多设备同步、AI 润色、习惯追踪。
          </p>
        </div>
      </div>
    </div>
  );
}
