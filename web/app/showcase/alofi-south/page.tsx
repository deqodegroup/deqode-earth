import { RmacWorkspace } from "@/components/rmac/RmacWorkspace";

export default function AlofiSouthShowcasePage() {
  return (
    <RmacWorkspace
      userEmail="Public showcase preview"
      canReview
      previewMode
    />
  );
}
