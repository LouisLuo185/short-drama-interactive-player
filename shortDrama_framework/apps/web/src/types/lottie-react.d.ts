declare module "lottie-react" {
  import type { ComponentType } from "react";

  type LottieProps = {
    animationData: unknown;
    loop?: boolean;
    autoplay?: boolean;
    className?: string;
    onComplete?: () => void;
  };

  const Lottie: ComponentType<LottieProps>;
  export default Lottie;
}
