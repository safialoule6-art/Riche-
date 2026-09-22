import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { LoadingScreen } from '../screens/LoadingScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { colors } from '../theme';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.paper, card: colors.paper, text: colors.ink } };

export function AppNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator initialRouteName="Loading" screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="Loading" component={LoadingScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
