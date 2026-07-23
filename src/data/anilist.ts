export type AniListQuarter = 1 | 2 | 3 | 4;

export type AniListAnimeRelease = {
  id: number;
  title: string;
  genres: string[];
  coverImage: string | null;
  releaseYear: number;
  releaseMonth: number;
  releaseDay: number | null;
  siteUrl: string | null;
};

type AniListResponse = {
  data?: {
    Page?: {
      media?: Array<{
        id: number;
        title: {
          english: string | null;
          romaji: string | null;
          native: string | null;
        };
        genres: string[] | null;
        coverImage: { large: string | null } | null;
        startDate: {
          year: number | null;
          month: number | null;
          day: number | null;
        } | null;
        siteUrl: string | null;
      }>;
    };
  };
};

const anilistEndpoint = "https://graphql.anilist.co";

const seasonByQuarter: Record<AniListQuarter, "WINTER" | "SPRING" | "SUMMER" | "FALL"> = {
  1: "WINTER",
  2: "SPRING",
  3: "SUMMER",
  4: "FALL",
};

const quarterMonths: Record<AniListQuarter, [number, number, number]> = {
  1: [1, 2, 3],
  2: [4, 5, 6],
  3: [7, 8, 9],
  4: [10, 11, 12],
};

const anilistQuarterQuery = `
  query ($season: MediaSeason!, $seasonYear: Int!) {
    Page(page: 1, perPage: 50) {
      media(
        type: ANIME
        season: $season
        seasonYear: $seasonYear
        format_in: [TV, MOVIE, ONA, OVA, SPECIAL]
        isAdult: false
        sort: [START_DATE, POPULARITY_DESC]
      ) {
        id
        title {
          english
          romaji
          native
        }
        genres
        coverImage {
          large
        }
        startDate {
          year
          month
          day
        }
        siteUrl
      }
    }
  }
`;

export function getCurrentAniListQuarter(date = new Date()) {
  return Math.floor(date.getMonth() / 3 + 1) as AniListQuarter;
}

export function getQuarterMonths(quarter: AniListQuarter) {
  return quarterMonths[quarter];
}

export async function getAniListQuarterReleases(
  year: number,
  quarter: AniListQuarter,
): Promise<AniListAnimeRelease[]> {
  try {
    const response = await fetch(anilistEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: anilistQuarterQuery,
        variables: {
          season: seasonByQuarter[quarter],
          seasonYear: year,
        },
      }),
      next: { revalidate: 60 * 60 * 6 },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as AniListResponse;
    const allowedMonths = new Set(quarterMonths[quarter]);

    return (payload.data?.Page?.media ?? [])
      .flatMap((media) => {
        const startDate = media.startDate;

        if (
          !startDate?.year ||
          !startDate.month ||
          startDate.year !== year ||
          !allowedMonths.has(startDate.month)
        ) {
          return [];
        }

        return [{
          id: media.id,
          title: media.title.native ?? media.title.romaji ?? media.title.english ?? "Untitled",
          genres: media.genres ?? [],
          coverImage: media.coverImage?.large ?? null,
          releaseYear: startDate.year,
          releaseMonth: startDate.month,
          releaseDay: startDate.day,
          siteUrl: media.siteUrl,
        }];
      })
      .sort((left, right) => {
        const leftDate = new Date(left.releaseYear, left.releaseMonth - 1, left.releaseDay ?? 31).getTime();
        const rightDate = new Date(right.releaseYear, right.releaseMonth - 1, right.releaseDay ?? 31).getTime();

        return leftDate - rightDate || left.title.localeCompare(right.title);
      });
  } catch {
    return [];
  }
}
