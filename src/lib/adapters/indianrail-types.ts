export interface IndianRailStation {
  NameEn: string;
  NameHn: string;
  StationCode: string;
  Longitude: string;
  Latitude: string;
}

export interface IndianRailAutoCompleteResponse {
  ResponseCode: string;
  Status: string;
  Station: IndianRailStation[];
  Message: string | null;
}

export interface IndianRailAvailabilityEntry {
  JourneyDate: string;     // "06-10-2018"
  Availability: string;    // "GNWL28/WL15"
  Confirm: string;         // "36 %"
}

export interface IndianRailAvailabilityResponse {
  ResponseCode: string;
  TrainNo: string;
  From: string;
  To: string | null;
  ClassCode: string;
  Quota: string;
  Availability: IndianRailAvailabilityEntry[];
  Message: string;
}

export interface IndianRailTrainBetweenStation {
  TrainNo: string;
  TrainName: string;
  Source: string;
  Destination: string;
  ArrivalTime: string; // "15:20:00"
  DepartureTime: string; // "16:10:00"
  TravelTime: string; // "23:10"
  TrainType: string;
  DaysOfRun: { // Usually returns something like {"Mon": "Y", "Tue": "Y"...} or similar based on their API. We will type flexibly.
    [day: string]: string; 
  } | string;
  Classes: string; // "1A 2A 3A SL"
}

export interface IndianRailTrainBetweenStationResponse {
  ResponseCode: string;
  Status: string;
  TotalTrains: number;
  Trains: IndianRailTrainBetweenStation[];
  Message: string | null;
}
