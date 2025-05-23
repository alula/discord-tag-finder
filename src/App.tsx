import { Toaster } from "sonner";
import { WordFinder } from "@/components/WordFinder";

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        expand={false}
        richColors
        closeButton
        theme="light"
      />
      <WordFinder />
    </>
  );
}

export default App;
