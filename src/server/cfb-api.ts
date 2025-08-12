const BASE_URL = "https://api.collegefootballdata.com";

export type CFBClassification = "fbs" | "fcs" | "ii" | "iii" | null;

export type CFBGame = {
  id: number;
  season: number;
  week: number;
  seasonType: "regular" | "postseason";
  startDate: string; // ISO 8601 format
  startTimeTBD: boolean;
  completed: boolean;
  neutralSite: boolean;
  conferenceGame: boolean;
  attendance: number | null;
  venueId: number;
  venue: string;
  homeId: number;
  homeTeam: string;
  homeClassification: CFBClassification;
  homeConference: string;
  homePoints: number | null;
  homeLineScores: number[] | null;
  homePostgameWinProbability: number | null;
  homePregameElo: number | null;
  homePostgameElo: number | null;
  awayId: number;
  awayTeam: string;
  awayClassification: CFBClassification;
  awayConference: string;
  awayPoints: number | null;
  awayLineScores: number[] | null;
  awayPostgameWinProbability: number | null;
  awayPregameElo: number | null;
  awayPostgameElo: number | null;
  excitementIndex: number | null;
  highlights: string;
  notes: string | null;
};

async function get<T = unknown>(
  path: `/${string}`,
  params?: Record<string, string | number>,
  init?: RequestInit,
) {
  const url = new URL(path, BASE_URL);

  const headers = {
    Authorization: `Bearer ${process.env.CFB_API_KEY}`,
    "Content-Type": "application/json",
  };

  if (params) {
    url.search = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching ${url}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

export async function getGames(
  params:
    | { id: number }
    | {
        year: number;
        week?: number;
        classification?: Exclude<CFBClassification, null>;
        seasonType?: CFBGame["seasonType"];
      },
) {
  const res = await get<CFBGame[]>("/games", params);
  return res.map((game) => ({
    ...game,
    startDate: new Date(game.startDate),
  }));
}
