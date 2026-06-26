export type TeamChampionshipHistory = {
  currentTitles: number;
  targetTitle: number;
  lastTitleYear: number | null;
};

const KBO_CHAMPIONS_BY_SEASON: Array<{
  seasonYear: number;
  teamShortName: string;
}> = [
  { seasonYear: 1982, teamShortName: '두산' },
  { seasonYear: 1983, teamShortName: 'KIA' },
  { seasonYear: 1984, teamShortName: '롯데' },
  { seasonYear: 1985, teamShortName: '삼성' },
  { seasonYear: 1986, teamShortName: 'KIA' },
  { seasonYear: 1987, teamShortName: 'KIA' },
  { seasonYear: 1988, teamShortName: 'KIA' },
  { seasonYear: 1989, teamShortName: 'KIA' },
  { seasonYear: 1990, teamShortName: 'LG' },
  { seasonYear: 1991, teamShortName: 'KIA' },
  { seasonYear: 1992, teamShortName: '롯데' },
  { seasonYear: 1993, teamShortName: 'KIA' },
  { seasonYear: 1994, teamShortName: 'LG' },
  { seasonYear: 1995, teamShortName: '두산' },
  { seasonYear: 1996, teamShortName: 'KIA' },
  { seasonYear: 1997, teamShortName: 'KIA' },
  { seasonYear: 1998, teamShortName: '현대' },
  { seasonYear: 1999, teamShortName: '한화' },
  { seasonYear: 2000, teamShortName: '현대' },
  { seasonYear: 2001, teamShortName: '두산' },
  { seasonYear: 2002, teamShortName: '삼성' },
  { seasonYear: 2003, teamShortName: '현대' },
  { seasonYear: 2004, teamShortName: '현대' },
  { seasonYear: 2005, teamShortName: '삼성' },
  { seasonYear: 2006, teamShortName: '삼성' },
  { seasonYear: 2007, teamShortName: 'SSG' },
  { seasonYear: 2008, teamShortName: 'SSG' },
  { seasonYear: 2009, teamShortName: 'KIA' },
  { seasonYear: 2010, teamShortName: 'SSG' },
  { seasonYear: 2011, teamShortName: '삼성' },
  { seasonYear: 2012, teamShortName: '삼성' },
  { seasonYear: 2013, teamShortName: '삼성' },
  { seasonYear: 2014, teamShortName: '삼성' },
  { seasonYear: 2015, teamShortName: '두산' },
  { seasonYear: 2016, teamShortName: '두산' },
  { seasonYear: 2017, teamShortName: 'KIA' },
  { seasonYear: 2018, teamShortName: 'SSG' },
  { seasonYear: 2019, teamShortName: '두산' },
  { seasonYear: 2020, teamShortName: 'NC' },
  { seasonYear: 2021, teamShortName: 'KT' },
  { seasonYear: 2022, teamShortName: 'SSG' },
  { seasonYear: 2023, teamShortName: 'LG' },
  { seasonYear: 2024, teamShortName: 'KIA' },
  { seasonYear: 2025, teamShortName: 'LG' },
];

export function getTeamChampionshipHistory(
  teamShortName: string,
): TeamChampionshipHistory {
  const seasonsWon = KBO_CHAMPIONS_BY_SEASON.filter(
    (champion) => champion.teamShortName === teamShortName,
  );
  const currentTitles = seasonsWon.length;

  return {
    currentTitles,
    targetTitle: currentTitles + 1,
    lastTitleYear: seasonsWon.at(-1)?.seasonYear ?? null,
  };
}
