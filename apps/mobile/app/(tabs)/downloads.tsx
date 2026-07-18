import { PlaceholderScreen } from "@/components/PlaceholderScreen";
import { useI18n } from "@/lib/i18n";

export default function DownloadsScreen() {
  const { t, arabic } = useI18n();
  return <PlaceholderScreen title={t.downloads.title} arabic={arabic.downloads} />;
}
