declare module 'react-native-otp-entry' {
  import { ComponentType } from 'react';
  import { ViewProps } from 'react-native';

  export interface OtpInputProps extends ViewProps {
    numberOfDigits?: number;
    onTextChange?: (text: string) => void;
    onFilled?: (text: string) => void;
    focusColor?: string;
    autoFocus?: boolean;
    placeholder?: string;
    theme?: any;
  }

  export const OtpInput: ComponentType<OtpInputProps>;
  export default OtpInput;
}

declare module '@react-native-google-signin/google-signin' {
  export const GoogleSignin: any;
}

declare module '@react-native-vector-icons/material-community' {
  import { ComponentType } from 'react';
  const Icon: ComponentType<any>;
  export default Icon;
}

// Allow using className with nativewind
import 'react-native';

declare module 'react-native' {
  // Allow Tailwind-style `className` prop used by nativewind
  interface ViewProps {
    className?: string;
  }
  interface TextProps {
    className?: string;
  }
  interface TextInputProps {
    className?: string;
  }
  interface TouchableOpacityProps {
    className?: string;
  }
}
