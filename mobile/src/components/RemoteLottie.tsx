import LottieView from 'lottie-react-native';
import { forwardRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

type RemoteLottieProps = { uri: string; style?: StyleProp<ViewStyle>; autoPlay?: boolean; loop?: boolean; speed?: number };

export const RemoteLottie = forwardRef<LottieView, RemoteLottieProps>(({ uri, ...props }, ref) => (
  <LottieView ref={ref} source={{ uri }} autoPlay={props.autoPlay ?? true} loop={props.loop ?? true} style={props.style} speed={props.speed} />
));

RemoteLottie.displayName = 'RemoteLottie';
