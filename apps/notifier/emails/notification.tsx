import {
  Body,
  Font,
  Head,
  Html,
  pixelBasedPreset,
  Preview,
  Tailwind,
} from "@react-email/components";

import type { Game } from "@cfb-picks/cfbd";
import type { InferSelectModel } from "@cfb-picks/db";
import type { CFBPick, teams } from "@cfb-picks/db/schema";
import { isTeamTotalPickType } from "@cfb-picks/db/schema";

function PickDisplay(props: {
  pick: CFBPick & { team: InferSelectModel<typeof teams>; game: Game };
}) {
  const { pick } = props;

  const cfbTeamName =
    "cfbTeamId" in pick
      ? pick.game.homeId === pick.cfbTeamId
        ? pick.game.homeTeam
        : pick.game.awayTeam
      : null;

  return (
    <p className="text-sm">
      {pick.team.name}:{" "}
      <span>
        {pick.pickType === "SPREAD"
          ? `${cfbTeamName} ${pick.spread > 0 ? "+" : ""}${pick.spread}`
          : pick.pickType === "MONEYLINE"
            ? `${cfbTeamName} ML`
            : isTeamTotalPickType(pick.pickType)
              ? `${cfbTeamName} Team Total ${pick.pickType.endsWith("OVER") ? "o" : "u"}${pick.total}`
              : `${pick.pickType === "OVER" ? "o" : "u"}${pick.total}`}
        {pick.duration !== "FULL" && ` (${pick.duration}) `}
        {` (${pick.odds > 0 ? "+" : ""}${pick.odds})${pick.double ? " (2u)" : ""}`}
      </span>
    </p>
  );
}

export default function NotificationEmail(props: {
  picks: (CFBPick & { team: InferSelectModel<typeof teams>; game: Game })[];
}) {
  const uniqueGames = Array.from(new Set(props.picks.map((pick) => pick.game.id))).map((id) => {
    return props.picks.find((pick) => pick.game.id === id)?.game;
  }) as Game[];

  const picksByGame = uniqueGames.map((game) => {
    return {
      game,
      picks: props.picks.filter((pick) => pick.game.id === game.id),
    };
  });

  picksByGame.sort((a, b) => a.game.startDate.getTime() - b.game.startDate.getTime());

  const numPicks = props.picks.length;

  return (
    <Tailwind
      config={{
        presets: [pixelBasedPreset],
      }}
    >
      <Html lang="en">
        <Preview>
          {numPicks.toString()} pick{numPicks > 1 ? "s" : ""} have been locked in!
        </Preview>
        <Head>
          <Font
            fontFamily="Inter"
            fallbackFontFamily={["Helvetica", "Verdana", "sans-serif"]}
            fontWeight={400}
            fontStyle="normal"
            webFont={{
              url: "https://fonts.gstatic.com/s/inter/v19/UcCm3FwrK3iLTcvnUwkT9mI1F55MKw.woff2",
              format: "woff2",
            }}
          />
        </Head>
        <Body className="mx-4">
          <h1 className="text-center text-lg font-bold">Picks have been locked in</h1>
          {picksByGame.map(({ game, picks }) => (
            <div className="my-4 rounded-md border-solid px-4" key={game.id}>
              <h3 className="text-base font-bold">
                {game.awayTeam} @ {game.homeTeam} - {game.startDate.toLocaleString()}
              </h3>
              {picks.map((pick) => (
                <PickDisplay pick={pick} key={pick.id} />
              ))}
            </div>
          ))}
        </Body>
      </Html>
    </Tailwind>
  );
}

NotificationEmail.PreviewProps = {
  picks: [
    {
      id: 19,
      teamId: 1,
      season: 2025,
      week: 1,
      gameId: 401762522,
      pickType: "SPREAD",
      duration: "FULL",
      odds: -120,
      double: false,
      total: null,
      spread: 3,
      cfbTeamId: 58,
      createdAt: new Date("2025-08-28T05:35:41.000Z"),
      notifications: [],
      team: { id: 1, name: "Test" },
      game: {
        id: 401762522,
        season: 2025,
        week: 1,
        seasonType: "regular",
        startDate: new Date("2025-08-28T21:30:00.000Z"),
        startTimeTBD: false,
        completed: true,
        neutralSite: false,
        conferenceGame: false,
        attendance: null,
        venueId: 3886,
        venue: "Raymond James Stadium",
        homeId: 58,
        homeTeam: "South Florida",
        homeClassification: "fbs",
        homeConference: "American Athletic",
        homePoints: 34,
        homeLineScores: [Array],
        homePostgameWinProbability: 0.9718407988548279,
        homePregameElo: 1456,
        homePostgameElo: 1536,
        awayId: 68,
        awayTeam: "Boise State",
        awayClassification: "fbs",
        awayConference: "Mountain West",
        awayPoints: 7,
        awayLineScores: [Array],
        awayPostgameWinProbability: 0.02815920114517212,
        awayPregameElo: 1676,
        awayPostgameElo: 1596,
        excitementIndex: 5.137221554324761,
        highlights: "",
        notes: null,
      },
    },
    {
      id: 18,
      teamId: 1,
      season: 2025,
      week: 1,
      gameId: 401752670,
      pickType: "OVER",
      duration: "FULL",
      odds: -120,
      double: false,
      total: 41,
      spread: null,
      cfbTeamId: null,
      createdAt: new Date("2025-08-28T04:50:59.000Z"),
      notifications: [],
      team: { id: 3, name: "Gogan Studley" },
      game: {
        id: 401762522,
        season: 2025,
        week: 1,
        seasonType: "regular",
        startDate: new Date("2025-08-28T21:30:00.000Z"),
        startTimeTBD: false,
        completed: true,
        neutralSite: false,
        conferenceGame: false,
        attendance: null,
        venueId: 3886,
        venue: "Raymond James Stadium",
        homeId: 58,
        homeTeam: "South Florida",
        homeClassification: "fbs",
        homeConference: "American Athletic",
        homePoints: 34,
        homeLineScores: [Array],
        homePostgameWinProbability: 0.9718407988548279,
        homePregameElo: 1456,
        homePostgameElo: 1536,
        awayId: 68,
        awayTeam: "Boise State",
        awayClassification: "fbs",
        awayConference: "Mountain West",
        awayPoints: 7,
        awayLineScores: [Array],
        awayPostgameWinProbability: 0.02815920114517212,
        awayPregameElo: 1676,
        awayPostgameElo: 1596,
        excitementIndex: 5.137221554324761,
        highlights: "",
        notes: null,
      },
    },
    {
      id: 13,
      teamId: 2,
      season: 2025,
      week: 1,
      gameId: 401756846,
      pickType: "UNDER",
      duration: "FULL",
      odds: -110,
      double: false,
      total: 52,
      spread: null,
      cfbTeamId: null,
      createdAt: new Date("2025-08-23T14:58:58.000Z"),
      notifications: [],
      team: { id: 2, name: "Philbin Moore" },
      game: {
        id: 401756846,
        season: 2025,
        week: 1,
        seasonType: "regular",
        startDate: new Date("2025-08-23T16:00:00.000Z"),
        startTimeTBD: false,
        completed: true,
        neutralSite: true,
        conferenceGame: true,
        attendance: null,
        venueId: 3504,
        venue: "Aviva Stadium",
        homeId: 2306,
        homeTeam: "Kansas State",
        homeClassification: "fbs",
        homeConference: "Big 12",
        homePoints: 21,
        homeLineScores: [Array],
        homePostgameWinProbability: 0.20154441893100739,
        homePregameElo: 1669,
        homePostgameElo: 1664,
        awayId: 66,
        awayTeam: "Iowa State",
        awayClassification: "fbs",
        awayConference: "Big 12",
        awayPoints: 24,
        awayLineScores: [Array],
        awayPostgameWinProbability: 0.7984555810689926,
        awayPregameElo: 1616,
        awayPostgameElo: 1621,
        excitementIndex: 6.029094160739601,
        highlights: "",
        notes: "Aer Lingus College Football Classic",
      },
    },
    {
      id: 14,
      teamId: 3,
      season: 2025,
      week: 1,
      gameId: 401754516,
      pickType: "SPREAD",
      duration: "FULL",
      odds: -110,
      double: true,
      total: null,
      spread: -2.5,
      cfbTeamId: 62,
      createdAt: new Date("2025-08-23T15:59:16.000Z"),
      notifications: [],
      team: { id: 3, name: "Gogan Studley" },
      game: {
        id: 401754516,
        season: 2025,
        week: 1,
        seasonType: "regular",
        startDate: new Date("2025-08-23T23:30:00.000Z"),
        startTimeTBD: false,
        completed: true,
        neutralSite: false,
        conferenceGame: false,
        attendance: null,
        venueId: 7220,
        venue: "Clarence T.C. Ching Athletics Complex",
        homeId: 62,
        homeTeam: "Hawai'i",
        homeClassification: "fbs",
        homeConference: "Mountain West",
        homePoints: 23,
        homeLineScores: [Array],
        homePostgameWinProbability: 0.41016319394111633,
        homePregameElo: 1257,
        homePostgameElo: 1260,
        awayId: 24,
        awayTeam: "Stanford",
        awayClassification: "fbs",
        awayConference: "ACC",
        awayPoints: 20,
        awayLineScores: [Array],
        awayPostgameWinProbability: 0.5898368060588837,
        awayPregameElo: 1283,
        awayPostgameElo: 1280,
        excitementIndex: 7.307567862447438,
        highlights: "",
        notes: null,
      },
    },
    {
      id: 17,
      teamId: 4,
      season: 2025,
      week: 1,
      gameId: 401756846,
      pickType: "SPREAD",
      duration: "FULL",
      odds: -120,
      double: false,
      total: null,
      spread: -3,
      cfbTeamId: 2306,
      createdAt: new Date("2025-08-22T18:21:50.000Z"),
      notifications: [],
      team: { id: 4, name: "Clarke Jordan" },
      game: {
        id: 401756846,
        season: 2025,
        week: 1,
        seasonType: "regular",
        startDate: new Date("2025-08-23T16:00:00.000Z"),
        startTimeTBD: false,
        completed: true,
        neutralSite: true,
        conferenceGame: true,
        attendance: null,
        venueId: 3504,
        venue: "Aviva Stadium",
        homeId: 2306,
        homeTeam: "Kansas State",
        homeClassification: "fbs",
        homeConference: "Big 12",
        homePoints: 21,
        homeLineScores: [Array],
        homePostgameWinProbability: 0.20154441893100739,
        homePregameElo: 1669,
        homePostgameElo: 1664,
        awayId: 66,
        awayTeam: "Iowa State",
        awayClassification: "fbs",
        awayConference: "Big 12",
        awayPoints: 24,
        awayLineScores: [Array],
        awayPostgameWinProbability: 0.7984555810689926,
        awayPregameElo: 1616,
        awayPostgameElo: 1621,
        excitementIndex: 6.029094160739601,
        highlights: "",
        notes: "Aer Lingus College Football Classic",
      },
    },
  ],
};
