import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  memo,
} from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: NetInfoState | null;
}

interface NetworkContextValue {
  networkStatus: NetworkStatus;
  refresh: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue | undefined>(undefined);

export const useNetworkStatus = (): NetworkContextValue => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within NetworkStatusProvider');
  }
  return context;
};

interface NetworkStatusProviderProps {
  children: ReactNode;
  showOfflineBanner?: boolean;
}

// Offline banner component
const OfflineBanner = memo(() => {
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    return () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        styles.offlineBanner,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
          ],
        },
      ]}
    >
      <Text style={styles.offlineText}>No Internet Connection</Text>
    </Animated.View>
  );
});

OfflineBanner.displayName = 'OfflineBanner';

export const NetworkStatusProvider = memo<NetworkStatusProviderProps>(
  ({ children, showOfflineBanner = true }) => {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
      isConnected: true,
      isInternetReachable: null,
      type: 'unknown',
      details: null,
    });

    const updateNetworkStatus = useCallback((state: NetInfoState) => {
      setNetworkStatus({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state,
      });
    }, []);

    const refresh = useCallback(async () => {
      const state = await NetInfo.fetch();
      updateNetworkStatus(state);
    }, [updateNetworkStatus]);

    useEffect(() => {
      // Get initial state
      refresh();

      // Subscribe to network state updates
      const unsubscribe = NetInfo.addEventListener(updateNetworkStatus);

      return () => {
        unsubscribe();
      };
    }, [refresh, updateNetworkStatus]);

    const contextValue: NetworkContextValue = {
      networkStatus,
      refresh,
    };

    return (
      <NetworkContext.Provider value={contextValue}>
        {children}
        {showOfflineBanner && !networkStatus.isConnected && <OfflineBanner />}
      </NetworkContext.Provider>
    );
  }
);

NetworkStatusProvider.displayName = 'NetworkStatusProvider';

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 24,
    left: 0,
    right: 0,
    backgroundColor: '#CC0000',
    paddingVertical: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  offlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
