import { desc, eq } from "drizzle-orm";
import { weatherRecords } from "../../drizzle/schema";
import { getDb } from "../db";

export type ForecastDay = {
  date: string;
  conditionCode: number;
  temperatureMaxC: number;
  temperatureMinC: number;
  precipitationMm: number;
  precipitationProbability: number;
  windSpeedKph: number;
  et0Mm: number;
};

export type FieldWeather = {
  current: {
    observedAt: string;
    temperatureC: number;
    humidityPercent: number;
    rainfallMm: number;
    windSpeedKph: number;
    weatherCode: number;
  };
  forecast: ForecastDay[];
  forecastRainfallMm: number;
};

type OpenMeteoResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    precipitation: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    et0_fao_evapotranspiration: number[];
  };
};

function normalizeWeather(payload: OpenMeteoResponse): FieldWeather {
  if (!payload.current || !payload.daily) throw new Error("Weather provider returned an incomplete forecast.");
  const forecast = payload.daily.time.slice(0, 7).map((date, index) => ({
    date,
    conditionCode: payload.daily!.weather_code[index] ?? 0,
    temperatureMaxC: payload.daily!.temperature_2m_max[index] ?? 0,
    temperatureMinC: payload.daily!.temperature_2m_min[index] ?? 0,
    precipitationMm: payload.daily!.precipitation_sum[index] ?? 0,
    precipitationProbability: payload.daily!.precipitation_probability_max[index] ?? 0,
    windSpeedKph: payload.daily!.wind_speed_10m_max[index] ?? 0,
    et0Mm: payload.daily!.et0_fao_evapotranspiration[index] ?? 0,
  }));
  return {
    current: {
      observedAt: payload.current.time,
      temperatureC: payload.current.temperature_2m,
      humidityPercent: payload.current.relative_humidity_2m,
      rainfallMm: payload.current.precipitation,
      windSpeedKph: payload.current.wind_speed_10m,
      weatherCode: payload.current.weather_code,
    },
    forecast,
    forecastRainfallMm: forecast.slice(0, 2).reduce((total, day) => total + day.precipitationMm, 0),
  };
}

export async function refreshFieldWeather(field: { id: number; latitude: number; longitude: number }) {
  const query = new URLSearchParams({
    latitude: String(field.latitude),
    longitude: String(field.longitude),
    current: "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration",
    timezone: "auto",
    forecast_days: "7",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`);
  if (!response.ok) throw new Error("Unable to retrieve current weather for this field.");
  const weather = normalizeWeather((await response.json()) as OpenMeteoResponse);

  const db = await getDb();
  if (db) {
    await db.insert(weatherRecords).values({
      fieldId: field.id,
      recordedAt: new Date(),
      temperatureC: weather.current.temperatureC,
      humidityPercent: weather.current.humidityPercent,
      rainfallMm: weather.current.rainfallMm,
      windSpeedKph: weather.current.windSpeedKph,
      forecastRainfallMm: weather.forecastRainfallMm,
      forecastJson: JSON.stringify(weather.forecast),
    });
  }
  return weather;
}

export async function getStoredWeather(fieldId: number): Promise<FieldWeather | null> {
  const db = await getDb();
  if (!db) return null;
  const [weather] = await db
    .select()
    .from(weatherRecords)
    .where(eq(weatherRecords.fieldId, fieldId))
    .orderBy(desc(weatherRecords.recordedAt))
    .limit(1);
  if (!weather) return null;
  return {
    current: {
      observedAt: weather.recordedAt.toISOString(),
      temperatureC: weather.temperatureC,
      humidityPercent: weather.humidityPercent,
      rainfallMm: weather.rainfallMm,
      windSpeedKph: weather.windSpeedKph,
      weatherCode: 0,
    },
    forecast: weather.forecastJson ? (JSON.parse(weather.forecastJson) as ForecastDay[]) : [],
    forecastRainfallMm: weather.forecastRainfallMm,
  };
}
