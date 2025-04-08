import { describe, it, expect, beforeEach } from 'vitest';

// Mock state
const mockState = {
  authorizedProviders: new Map(),
  weatherData: new Map(),
  contractOwner: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  txSender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'
};

// Mock functions
const addProvider = (provider) => {
  if (mockState.txSender !== mockState.contractOwner) {
    return { type: 'err', value: 1 };
  }
  
  mockState.authorizedProviders.set(provider, { authorized: true });
  return { type: 'ok', value: true };
};

const removeProvider = (provider) => {
  if (mockState.txSender !== mockState.contractOwner) {
    return { type: 'err', value: 1 };
  }
  
  mockState.authorizedProviders.set(provider, { authorized: false });
  return { type: 'ok', value: true };
};

const submitWeatherData = (location, timestamp, temperature, rainfall, windSpeed) => {
  const provider = mockState.txSender;
  const providerStatus = mockState.authorizedProviders.get(provider);
  
  if (!providerStatus || !providerStatus.authorized) {
    return { type: 'err', value: 1 };
  }
  
  const key = `${location}-${timestamp}`;
  mockState.weatherData.set(key, {
    temperature,
    rainfall,
    windSpeed,
    provider
  });
  
  return { type: 'ok', value: true };
};

const getWeatherData = (location, timestamp) => {
  const key = `${location}-${timestamp}`;
  if (mockState.weatherData.has(key)) {
    return { type: 'some', value: mockState.weatherData.get(key) };
  }
  return { type: 'none' };
};

const isExtremeWeather = (location, timestamp) => {
  const key = `${location}-${timestamp}`;
  if (!mockState.weatherData.has(key)) {
    return false;
  }
  
  const data = mockState.weatherData.get(key);
  return (
      data.rainfall > 100 ||
      data.temperature < -5 ||
      data.windSpeed > 50
  );
};

// Tests
describe('Weather Oracle Contract', () => {
  beforeEach(() => {
    // Reset state before each test
    mockState.authorizedProviders = new Map();
    mockState.weatherData = new Map();
    mockState.txSender = mockState.contractOwner;
  });
  
  it('should add an authorized provider', () => {
    const provider = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = addProvider(provider);
    expect(result.type).toBe('ok');
    expect(mockState.authorizedProviders.get(provider).authorized).toBe(true);
  });
  
  it('should remove an authorized provider', () => {
    const provider = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    addProvider(provider);
    const result = removeProvider(provider);
    expect(result.type).toBe('ok');
    expect(mockState.authorizedProviders.get(provider).authorized).toBe(false);
  });
  
  it('should not allow non-owner to add provider', () => {
    mockState.txSender = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const provider = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = addProvider(provider);
    expect(result.type).toBe('err');
  });
  
  it('should allow authorized provider to submit weather data', () => {
    const provider = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    addProvider(provider);
    
    mockState.txSender = provider;
    const result = submitWeatherData('Location1', 12345, 25, 50, 10);
    expect(result.type).toBe('ok');
    
    const data = getWeatherData('Location1', 12345);
    expect(data.type).toBe('some');
    expect(data.value.temperature).toBe(25);
  });
  
  it('should not allow unauthorized provider to submit weather data', () => {
    mockState.txSender = 'ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    const result = submitWeatherData('Location1', 12345, 25, 50, 10);
    expect(result.type).toBe('err');
  });
  
  it('should correctly identify extreme weather', () => {
    const provider = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    addProvider(provider);
    
    mockState.txSender = provider;
    submitWeatherData('Location1', 12345, -10, 50, 10); // Extreme cold
    submitWeatherData('Location2', 12345, 25, 150, 10); // Heavy rain
    submitWeatherData('Location3', 12345, 25, 50, 60);  // Strong wind
    submitWeatherData('Location4', 12345, 25, 50, 10);  // Normal weather
    
    expect(isExtremeWeather('Location1', 12345)).toBe(true);
    expect(isExtremeWeather('Location2', 12345)).toBe(true);
    expect(isExtremeWeather('Location3', 12345)).toBe(true);
    expect(isExtremeWeather('Location4', 12345)).toBe(false);
  });
});
