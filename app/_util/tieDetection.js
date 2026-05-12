const TOP_CUTOFF_RANK = 5;

const normalizeScore = (score) => Number.parseFloat(score || 0).toFixed(2);

export const formatTieSummary = (tie) => {
  if (!tie) return '';

  return `Top ${tie.cutoffRank} tie: ranks ${tie.rankStart}-${tie.rankEnd} share ${tie.score} pts`;
};

const getScoreTotal = (score, eventName, judgeIds, criteriaList) => {
  return criteriaList.reduce((criteriaTotal, criteria) => {
    const judgeTotal = judgeIds.reduce((total, judgeId) => {
      return (
        total + Number.parseFloat(score?.[eventName]?.[judgeId]?.[criteria] ?? 0)
      );
    }, 0);

    return criteriaTotal + judgeTotal;
  }, 0);
};

export const findTopCutoffTie = (
  entries,
  { cutoffRank = TOP_CUTOFF_RANK, getId = (entry) => entry.id } = {},
) => {
  if (!entries || entries.length <= cutoffRank) return null;

  const sortedEntries = [...entries].sort(
    (a, b) => b.overallTotal - a.overallTotal,
  );
  const cutoffScore = normalizeScore(sortedEntries[cutoffRank - 1].overallTotal);
  const nextScore = normalizeScore(sortedEntries[cutoffRank].overallTotal);

  if (cutoffScore !== nextScore) return null;

  const rankStartIndex = sortedEntries.findIndex(
    (entry) => normalizeScore(entry.overallTotal) === cutoffScore,
  );

  let rankEndIndex = rankStartIndex;
  while (
    rankEndIndex + 1 < sortedEntries.length &&
    normalizeScore(sortedEntries[rankEndIndex + 1].overallTotal) === cutoffScore
  ) {
    rankEndIndex += 1;
  }

  const tiedEntries = sortedEntries.slice(rankStartIndex, rankEndIndex + 1);

  return {
    cutoffRank,
    rankStart: rankStartIndex + 1,
    rankEnd: rankEndIndex + 1,
    score: cutoffScore,
    ids: new Set(tiedEntries.map(getId)),
    tiedEntries,
  };
};

export const calculateIndividualTopCutoffTie = (
  participants,
  eventMetadata,
  eventName = eventMetadata?.name,
) => {
  if (!participants || !eventMetadata || !eventName) return null;

  const judgeIds = eventMetadata.judgeIdList || [];
  const criteriaList = Object.keys(eventMetadata.evalCriteria || {});
  const entries = participants.map((participant) => ({
    id: participant.studentId,
    overallTotal:
      participant.overallTotal ??
      getScoreTotal(participant.score, eventName, judgeIds, criteriaList),
  }));

  return findTopCutoffTie(entries);
};

export const calculateGroupTopCutoffTie = (
  participantsOrGroups,
  eventMetadata,
  eventName = eventMetadata?.name,
) => {
  if (!participantsOrGroups || !eventMetadata || !eventName) return null;

  const judgeIds = eventMetadata.judgeIdList || [];
  const criteriaList = Object.keys(eventMetadata.evalCriteria || {});
  const groupedEntries = participantsOrGroups.reduce(
    (groups, participantOrGroup) => {
      const district = participantOrGroup.district || 'Unknown';

      if (!groups[district]) {
        groups[district] = {
          id: district,
          overallTotal:
            participantOrGroup.overallTotal ??
            getScoreTotal(
              participantOrGroup.score,
              eventName,
              judgeIds,
              criteriaList,
            ),
        };
      }

      return groups;
    },
    {},
  );

  return findTopCutoffTie(Object.values(groupedEntries));
};
