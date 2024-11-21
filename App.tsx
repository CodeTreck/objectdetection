import React from 'react';
import { StyleSheet, View, Text, Dimensions, PixelRatio, FlatList, Button } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';

export default function App(): React.ReactNode {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const { width: screenWidthDIPs, height: screenHeightDIPs } = Dimensions.get('window');
  const pixelRatio = PixelRatio.get();
  const screenWidthPixels = screenWidthDIPs * pixelRatio;
  const screenHeightPixels = screenHeightDIPs * pixelRatio;
  const screenWidthPixelsRounded = Math.round(screenWidthPixels);
  const screenHeightPixelsRounded = Math.round(screenHeightPixels);

  const [isScanning, setIsScanning] = React.useState(false); // Scanning state
  const [boxes, setBoxes] = React.useState<
    { x: number; y: number; width: number; height: number; corners: {} }[]
  >([]);

  const [uniqueCodes, setUniqueCodes] = React.useState<
    { value: string; scanTime: number }[]
  >([]);

  // Timer to detect when no QR codes are in the frame
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes, frame) => {
      if(isScanning){
      if (timerRef.current) {
        clearTimeout(timerRef.current); // Reset timer on each call
      }

        if (codes.length > 0) {
          const startTime = Date.now();
  
          // Update the bounding boxes for the current frame
          const newBoxes = codes.map((code) => {
            const corners: any = code.corners.reduce((acc, corner, index) => {
              acc[`point${index + 1}x`] = corner.x * screenWidthPixelsRounded / frame.height;
              acc[`point${index + 1}y`] = corner.y * screenHeightPixelsRounded / frame.width;
              return acc;
            }, {});
            const x = (code.frame.x * screenWidthPixelsRounded) / frame.height;
            const y = (code.frame.y * screenHeightPixelsRounded) / frame.width;
            const width = ((code.frame.width * screenWidthPixelsRounded) / frame.height);
            const height = (code.frame.height * screenHeightPixelsRounded) / frame.width;
  
            return {
              x: x / pixelRatio,
              y: y / pixelRatio,
              width: width / pixelRatio,
              height: height / pixelRatio,
              corners: corners,
            };
          });
  
          setBoxes(newBoxes);
  
          const currentFrameValues = codes
            .map((code) => ({
              value: code.value,
              scanTime: Date.now() - startTime,
            }))
            .filter((data) => data.value !== undefined && data.value !== null);
  
          setUniqueCodes(currentFrameValues);
  
          // Restart the timer to clear boxes if no new QR codes are detected
          timerRef.current = setTimeout(() => {
            setBoxes([]);
            setUniqueCodes([]);
          }, 300); // 300ms timeout
        }
        else{
          setBoxes([]);
          setUniqueCodes([]);

        }
      }

    },
  });

  React.useEffect(() => {
    requestPermission();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current); // Clean up timer on unmount
      }
    };
  }, [requestPermission]);

  return (
    <View style={styles.container}>
      {hasPermission && device != null ? (
        <Camera
          device={device}
          style={StyleSheet.absoluteFill}
          isActive={true}
          codeScanner={codeScanner}
        />
      ) : (
        <Text>No Camera available or scanning is stopped.</Text>
      )}

      {/* Render the bounding boxes */}
      {
        boxes.map((box, index) => (
          <View
            key={index}
            style={[
              styles.box,
              {
                left: box.x,
                top: box.y,
                width: box.width,
                height: box.height,
              },
            ]}
          />
        ))}

      {/* White overlay for unique codes */}
      <View style={styles.overlay}>
        <Text style={styles.overlayTitle}>Scanned QR Codes</Text>
        <FlatList
          data={uniqueCodes}
          keyExtractor={(item, index) => `${item.value}-${index}`}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.codeText}>{item.value}</Text>
              <Text style={styles.timerText}>{item.scanTime} ms</Text>
            </View>
          )}
        />
        {/* Start and Stop Buttons */}
        {/* <View style={styles.buttonRow}>
          <Button
            title="Start"
            onPress={() => setIsScanning(true)}
            disabled={isScanning} // Disable the Start button if already scanning
          />
          <Button
            title="Stop"
            onPress={() => {
              setIsScanning(false);
              setBoxes([]);
              setUniqueCodes([]);
            }}
            disabled={!isScanning} // Disable the Stop button if not scanning
          />
        </View> */}
        <View style={styles.buttonRow}>
          {isScanning ? (
            <Button title="Stop" onPress={() => setIsScanning(false)} />
          ) : (
            <Button title="Start" onPress={() => setIsScanning(true)} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: '#aaff00',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: '40%',
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  overlayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 5,
  },
  codeText: {
    fontSize: 16,
    textAlign: 'left',
    flex: 1,
  },
  timerText: {
    fontSize: 14,
    textAlign: 'right',
    color: 'gray',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
});
