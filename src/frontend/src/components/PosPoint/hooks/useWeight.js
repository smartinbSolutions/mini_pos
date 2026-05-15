import { useCallback, useEffect, useRef, useState } from "react";

const useWeight = ({ setCurrentWeight, baudRate = 9600 } = {}) => {
  const [weight, setWeight] = useState(0);
  const [status, setStatus] = useState("Disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const [ports, setPorts] = useState([]);

  const setCurrentWeightRef = useRef(setCurrentWeight);

  const getDefaultPortPath = useCallback((availablePorts) => {
    const preferredPort =
      availablePorts.find((port) => {
        const label = [
          port.path,
          port.manufacturer,
          port.friendlyName,
          port.pnpId,
          port.vendorId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          label.includes("usb") ||
          label.includes("ftdi") ||
          label.includes("prolific") ||
          label.includes("ch340")
        );
      }) || availablePorts[0];

    return preferredPort?.path || "";
  }, []);

  useEffect(() => {
    setCurrentWeightRef.current = setCurrentWeight;
  }, [setCurrentWeight]);

  useEffect(() => {
    const api = window.api;

    if (!api?.onScaleData || !api?.onScaleStatus) {
      setStatus("Scale API not available");
      return undefined;
    }

    const removeDataListener = api.onScaleData((payload) => {
      const nextWeight = Number(payload?.weight);

      if (!Number.isFinite(nextWeight)) return;

      setWeight(nextWeight);
      setCurrentWeightRef.current?.(nextWeight);
    });

    const removeStatusListener = api.onScaleStatus((payload) => {
      setIsConnected(Boolean(payload?.connected));
      setStatus(payload?.message || "Disconnected");
    });

    return () => {
      removeDataListener?.();
      removeStatusListener?.();
    };
  }, []);

  const refreshPorts = useCallback(async () => {
    const api = window.api;

    if (!api?.listScalePorts) {
      setStatus("Scale API not available");
      return [];
    }

    const availablePorts = await api.listScalePorts();
    setPorts(availablePorts || []);
    return availablePorts || [];
  }, []);

  const connect = useCallback(
    async (path) => {
      const api = window.api;

      if (!api?.connectScale) {
        setStatus("Scale API not available");
        return;
      }

        setStatus("Connecting scale...");

      try {
        const availablePorts = await refreshPorts();
        const selectedPath = path || getDefaultPortPath(availablePorts);
        const result = await api.connectScale({ path: selectedPath, baudRate });

        if (!result?.ok) {
          setIsConnected(false);
          setStatus(result?.message || "Scale connection failed");
          return;
        }

        setIsConnected(true);
        setStatus(`Connected to ${result.path}`);
      } catch (error) {
        console.error("Scale connection failed:", error);
        setIsConnected(false);
        setStatus(error?.message || "Scale connection failed");
      }
    },
    [baudRate, getDefaultPortPath, refreshPorts],
  );

  const close = useCallback(async () => {
    const api = window.api;

    if (!api?.disconnectScale) return;

    await api.disconnectScale();
    setIsConnected(false);
    setStatus("Disconnected");
    setWeight(0);
    setCurrentWeightRef.current?.(0);
  }, []);

  useEffect(() => {
    refreshPorts().catch((error) => {
      console.error("Failed to list scale ports:", error);
      setStatus(error?.message || "Failed to list scale ports");
    });
  }, [refreshPorts]);

  return { weight, status, isConnected, ports, connect, close, refreshPorts };
};

export default useWeight;
