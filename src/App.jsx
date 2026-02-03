import { useMemo, useState } from 'react'
import './App.css'

const TEAM_COUNT_DEFAULT = 14

const makeId = () => Math.random().toString(36).slice(2, 9)

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const num = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const createPlaceholderTeams = (count = TEAM_COUNT_DEFAULT) =>
  Array.from({ length: count }, (_, index) => ({
    id: makeId(),
    name: `Team ${index + 1}`,
    gp: 0,
    pts: 0,
    rw: 0,
    row: 0,
    gf: 0,
    ga: 0,
  }))

const createEmptyGame = (teams) => ({
  id: makeId(),
  homeId: teams[0]?.id ?? '',
  awayId: teams[1]?.id ?? '',
  outcome: 'TBD',
  probHome: 0.5,
})

const tiebreakers = {
  shl: (a, b) => {
    const gdA = a.gf - a.ga
    const gdB = b.gf - b.ga
    return (
      b.pts - a.pts ||
      b.row - a.row ||
      b.rw - a.rw ||
      gdB - gdA ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name)
    )
  },
  pointsGd: (a, b) => {
    const gdA = a.gf - a.ga
    const gdB = b.gf - b.ga
    return (
      b.pts - a.pts ||
      gdB - gdA ||
      b.gf - a.gf ||
      a.name.localeCompare(b.name)
    )
  },
}

const sortStandings = (list, rule) =>
  [...list].sort(rule === 'pointsGd' ? tiebreakers.pointsGd : tiebreakers.shl)

const applyResult = (teamsById, homeId, awayId, result) => {
  const home = teamsById.get(homeId)
  const away = teamsById.get(awayId)
  if (!home || !away || homeId === awayId) return

  home.gp += 1
  away.gp += 1

  if (result === 'H_REG') {
    home.pts += 3
    home.rw += 1
    home.row += 1
  } else if (result === 'A_REG') {
    away.pts += 3
    away.rw += 1
    away.row += 1
  } else if (result === 'H_OT') {
    home.pts += 2
    away.pts += 1
    home.row += 1
  } else if (result === 'A_OT') {
    away.pts += 2
    home.pts += 1
    away.row += 1
  }
}

const buildStandingsMap = (teams) => {
  const map = new Map()
  teams.forEach((team) => {
    map.set(team.id, {
      ...team,
      gp: num(team.gp),
      pts: num(team.pts),
      rw: num(team.rw),
      row: num(team.row),
      gf: num(team.gf),
      ga: num(team.ga),
    })
  })
  return map
}

const computeDeterministicStandings = (teams, games, rule) => {
  const standingsMap = buildStandingsMap(teams)
  games.forEach((game) => {
    if (game.outcome !== 'TBD') {
      applyResult(standingsMap, game.homeId, game.awayId, game.outcome)
    }
  })
  return sortStandings([...standingsMap.values()], rule)
}

const simulateStandings = (teams, games, settings, rule) => {
  const standingsMap = buildStandingsMap(teams)

  games.forEach((game) => {
    if (game.outcome !== 'TBD') {
      applyResult(standingsMap, game.homeId, game.awayId, game.outcome)
      return
    }

    const baseProb = clamp(num(game.probHome), 0.05, 0.95)
    const adjustedProb = clamp(baseProb + settings.homeAdv, 0.05, 0.95)
    const homeWins = Math.random() < adjustedProb
    const goesOT = Math.random() < settings.otShare

    if (homeWins) {
      applyResult(standingsMap, game.homeId, game.awayId, goesOT ? 'H_OT' : 'H_REG')
    } else {
      applyResult(standingsMap, game.homeId, game.awayId, goesOT ? 'A_OT' : 'A_REG')
    }
  })

  return sortStandings([...standingsMap.values()], rule)
}

const buildRankMap = (standings) => {
  const map = new Map()
  standings.forEach((team, index) => {
    map.set(team.id, index + 1)
  })
  return map
}

function App() {
  const [teams, setTeams] = useState(createPlaceholderTeams())
  const [games, setGames] = useState([])
  const [targetTeamId, setTargetTeamId] = useState(teams[0]?.id ?? '')
  const [iterations, setIterations] = useState(2000)
  const [otShare, setOtShare] = useState(0.25)
  const [homeAdv, setHomeAdv] = useState(0.05)
  const [tiebreakRule, setTiebreakRule] = useState('shl')
  const [directCut, setDirectCut] = useState(6)
  const [playInStart, setPlayInStart] = useState(7)
  const [playInEnd, setPlayInEnd] = useState(10)
  const [relegationStart, setRelegationStart] = useState(13)
  const [simulation, setSimulation] = useState(null)

  const deterministicStandings = useMemo(
    () => computeDeterministicStandings(teams, games, tiebreakRule),
    [teams, games, tiebreakRule]
  )

  const targetTeam = teams.find((team) => team.id === targetTeamId)

  const handleAddTeam = () => {
    setTeams((prev) => {
      const next = [
        ...prev,
        {
          id: makeId(),
          name: `Team ${prev.length + 1}`,
          gp: 0,
          pts: 0,
          rw: 0,
          row: 0,
          gf: 0,
          ga: 0,
        },
      ]
      if (!targetTeamId) {
        setTargetTeamId(next[0]?.id ?? '')
      }
      return next
    })
  }

  const handleRemoveTeam = (teamId) => {
    setTeams((prev) => prev.filter((team) => team.id !== teamId))
    setGames((prev) => prev.filter((game) => game.homeId !== teamId && game.awayId !== teamId))
    if (teamId === targetTeamId) {
      const remaining = teams.filter((team) => team.id !== teamId)
      setTargetTeamId(remaining[0]?.id ?? '')
    }
  }

  const handleResetTeams = () => {
    const placeholders = createPlaceholderTeams()
    setTeams(placeholders)
    setTargetTeamId(placeholders[0]?.id ?? '')
    setGames([])
  }

  const handleTeamChange = (teamId, field, value) => {
    setTeams((prev) =>
      prev.map((team) => (team.id === teamId ? { ...team, [field]: value } : team))
    )
  }

  const handleAddGame = () => {
    setGames((prev) => [...prev, createEmptyGame(teams)])
  }

  const handleGameChange = (gameId, field, value) => {
    setGames((prev) =>
      prev.map((game) => (game.id === gameId ? { ...game, [field]: value } : game))
    )
  }

  const handleRemoveGame = (gameId) => {
    setGames((prev) => prev.filter((game) => game.id !== gameId))
  }

  const toCsvRow = (values) =>
    values
      .map((value) => {
        const text = String(value ?? '')
        return text.includes(',') || text.includes('"') || text.includes('\n')
          ? `"${text.replace(/"/g, '""')}"`
          : text
      })
      .join(',')

  const parseCsv = (text) => {
    const rows = []
    let current = []
    let value = ''
    let inQuotes = false
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i]
      const next = text[i + 1]
      if (char === '"' && inQuotes && next === '"') {
        value += '"'
        i += 1
      } else if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        current.push(value)
        value = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (value.length > 0 || current.length > 0) {
          current.push(value)
          rows.push(current)
          current = []
          value = ''
        }
      } else {
        value += char
      }
    }
    if (value.length > 0 || current.length > 0) {
      current.push(value)
      rows.push(current)
    }
    return rows.filter((row) => row.some((cell) => cell.trim() !== ''))
  }

  const downloadCsv = (filename, content) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExportTeams = () => {
    const header = ['name', 'gp', 'pts', 'rw', 'row', 'gf', 'ga']
    const rows = [header, ...teams.map((team) => header.map((key) => team[key]))]
    const content = rows.map(toCsvRow).join('\n')
    downloadCsv('shl-teams.csv', content)
  }

  const handleDownloadTeamsTemplate = () => {
    const header = ['name', 'gp', 'pts', 'rw', 'row', 'gf', 'ga']
    const sample = [
      ['Vaxjo Lakers', 38, 75, 16, 22, 112, 89],
      ['Frolunda', 38, 70, 15, 20, 104, 92],
      ['Skelleftea', 38, 68, 14, 19, 109, 95],
    ]
    const content = [header, ...sample].map(toCsvRow).join('\n')
    downloadCsv('shl-teams-template.csv', content)
  }

  const handleExportGames = () => {
    const header = ['home', 'away', 'outcome', 'probHome']
    const teamMap = new Map(teams.map((team) => [team.id, team.name]))
    const rows = [
      header,
      ...games.map((game) => [
        teamMap.get(game.homeId) ?? '',
        teamMap.get(game.awayId) ?? '',
        game.outcome,
        game.probHome,
      ]),
    ]
    const content = rows.map(toCsvRow).join('\n')
    downloadCsv('shl-games.csv', content)
  }

  const handleDownloadGamesTemplate = () => {
    const header = ['home', 'away', 'outcome', 'probHome']
    const sample = [
      ['Vaxjo Lakers', 'Frolunda', 'TBD', 0.58],
      ['Skelleftea', 'Vaxjo Lakers', 'H_REG', 0.6],
      ['Frolunda', 'Skelleftea', 'A_OT', 0.48],
    ]
    const content = [header, ...sample].map(toCsvRow).join('\n')
    downloadCsv('shl-games-template.csv', content)
  }

  const handleImportTeams = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''))
      const [header, ...data] = rows
      if (!header) return
      const normalized = header.map((key) => key.trim().toLowerCase())
      const nextTeams = data.map((row) => {
        const lookup = (key) => row[normalized.indexOf(key)] ?? ''
        return {
          id: makeId(),
          name: lookup('name') || 'Unnamed team',
          gp: num(lookup('gp')),
          pts: num(lookup('pts')),
          rw: num(lookup('rw')),
          row: num(lookup('row')),
          gf: num(lookup('gf')),
          ga: num(lookup('ga')),
        }
      })
      setTeams(nextTeams)
      setTargetTeamId(nextTeams[0]?.id ?? '')
      setGames([])
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const handleImportGames = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ''))
      const [header, ...data] = rows
      if (!header) return
      const normalized = header.map((key) => key.trim().toLowerCase())
      const nameMap = new Map(teams.map((team) => [team.name.trim().toLowerCase(), team]))
      const nextTeams = [...teams]

      const findOrCreate = (name) => {
        const key = String(name).trim().toLowerCase()
        if (!key) return ''
        const existing = nameMap.get(key)
        if (existing) return existing.id
        const created = {
          id: makeId(),
          name: name,
          gp: 0,
          pts: 0,
          rw: 0,
          row: 0,
          gf: 0,
          ga: 0,
        }
        nameMap.set(key, created)
        nextTeams.push(created)
        return created.id
      }

      const nextGames = data.map((row) => {
        const lookup = (key) => row[normalized.indexOf(key)] ?? ''
        return {
          id: makeId(),
          homeId: findOrCreate(lookup('home')),
          awayId: findOrCreate(lookup('away')),
          outcome: lookup('outcome') || 'TBD',
          probHome: clamp(num(lookup('probhome')) || 0.5, 0.05, 0.95),
        }
      })

      setTeams(nextTeams)
      if (!targetTeamId && nextTeams[0]?.id) {
        setTargetTeamId(nextTeams[0].id)
      }
      setGames(nextGames)
    }
    reader.readAsText(file)
    event.target.value = ''
  }

  const runSimulation = () => {
    const safeIterations = clamp(num(iterations), 100, 20000)
    const summaryMap = new Map()
    const rankCounts = new Map()

    teams.forEach((team) => {
      summaryMap.set(team.id, { totalRank: 0, totalPoints: 0 })
    })

    for (let i = 0; i < safeIterations; i += 1) {
      const standings = simulateStandings(
        teams,
        games,
        {
          otShare: clamp(num(otShare), 0, 1),
          homeAdv: clamp(num(homeAdv), -0.2, 0.2),
        },
        tiebreakRule
      )

      const rankMap = buildRankMap(standings)
      standings.forEach((team) => {
        const summary = summaryMap.get(team.id)
        summary.totalRank += rankMap.get(team.id)
        summary.totalPoints += team.pts
      })

      const targetRank = rankMap.get(targetTeamId)
      if (targetRank) {
        rankCounts.set(targetRank, (rankCounts.get(targetRank) ?? 0) + 1)
      }
    }

    const expected = teams
      .map((team) => {
        const summary = summaryMap.get(team.id)
        return {
          ...team,
          avgRank: summary.totalRank / safeIterations,
          avgPts: summary.totalPoints / safeIterations,
        }
      })
      .sort((a, b) => a.avgRank - b.avgRank)

    const ranks = [...rankCounts.keys()].sort((a, b) => a - b)
    const best = ranks[0]
    const worst = ranks[ranks.length - 1]
    const avgRank = expected.find((team) => team.id === targetTeamId)?.avgRank ?? null
    const avgPts = expected.find((team) => team.id === targetTeamId)?.avgPts ?? null

    setSimulation({
      iterations: safeIterations,
      expected,
      rankCounts: ranks.map((rank) => ({
        rank,
        count: rankCounts.get(rank),
        pct: (rankCounts.get(rank) / safeIterations) * 100,
      })),
      targetSummary: {
        best,
        worst,
        avgRank,
        avgPts,
      },
    })
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">SHL Standings Lab</p>
          <h1>Simulate where your team lands in the table.</h1>
          <p className="lead">
            Enter current standings, add remaining games, then run deterministic scenarios or Monte
            Carlo simulations. Everything stays local with manual input.
          </p>
        </div>
        <div className="target-select">
          <label htmlFor="target-team">Team of focus</label>
          <select
            id="target-team"
            value={targetTeamId}
            onChange={(event) => setTargetTeamId(event.target.value)}
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name || 'Unnamed team'}
              </option>
            ))}
          </select>
          <p className="hint">Rank distributions and highlights will track this team.</p>
        </div>
      </header>

      <section className="panel">
        <div className="panel-header">
          <h2>Teams</h2>
          <div className="panel-actions">
            <label className="file-button">
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportTeams} />
            </label>
            <button type="button" className="ghost" onClick={handleDownloadTeamsTemplate}>
              Download template
            </button>
            <button type="button" className="ghost" onClick={handleExportTeams}>
              Export CSV
            </button>
            <button type="button" className="ghost" onClick={handleResetTeams}>
              Reset to 14 placeholders
            </button>
            <button type="button" className="primary" onClick={handleAddTeam}>
              Add team
            </button>
          </div>
        </div>
        <p className="hint">
          Fill in current totals. RW = regulation wins, ROW = regulation + overtime wins. Leave
          extra fields at zero if you don&apos;t track them.
        </p>
        <div className="table">
          <div className="row header teams">
            <span>Team</span>
            <span>GP</span>
            <span>PTS</span>
            <span>RW</span>
            <span>ROW</span>
            <span>GF</span>
            <span>GA</span>
            <span></span>
          </div>
          {teams.map((team) => (
            <div className="row teams" key={team.id}>
              <input
                value={team.name}
                onChange={(event) => handleTeamChange(team.id, 'name', event.target.value)}
                placeholder="Team name"
              />
              <input
                type="number"
                min="0"
                value={team.gp}
                onChange={(event) => handleTeamChange(team.id, 'gp', event.target.value)}
              />
              <input
                type="number"
                min="0"
                value={team.pts}
                onChange={(event) => handleTeamChange(team.id, 'pts', event.target.value)}
              />
              <input
                type="number"
                min="0"
                value={team.rw}
                onChange={(event) => handleTeamChange(team.id, 'rw', event.target.value)}
              />
              <input
                type="number"
                min="0"
                value={team.row}
                onChange={(event) => handleTeamChange(team.id, 'row', event.target.value)}
              />
              <input
                type="number"
                min="0"
                value={team.gf}
                onChange={(event) => handleTeamChange(team.id, 'gf', event.target.value)}
              />
              <input
                type="number"
                min="0"
                value={team.ga}
                onChange={(event) => handleTeamChange(team.id, 'ga', event.target.value)}
              />
              <button
                type="button"
                className="ghost"
                onClick={() => handleRemoveTeam(team.id)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Remaining games</h2>
          <div className="panel-actions">
            <label className="file-button">
              Import CSV
              <input type="file" accept=".csv" onChange={handleImportGames} />
            </label>
            <button type="button" className="ghost" onClick={handleDownloadGamesTemplate}>
              Download template
            </button>
            <button type="button" className="ghost" onClick={handleExportGames}>
              Export CSV
            </button>
            <button type="button" className="primary" onClick={handleAddGame}>
              Add game
            </button>
          </div>
        </div>
        <p className="hint">
          Deterministic mode uses the selected outcome. Simulation uses the probability for games
          marked TBD.
        </p>
        <div className="table">
          <div className="row header games">
            <span>Home</span>
            <span>Away</span>
            <span>Outcome</span>
            <span>Home win %</span>
            <span></span>
          </div>
          {games.map((game) => (
            <div className="row games" key={game.id}>
              <select
                value={game.homeId}
                onChange={(event) => handleGameChange(game.id, 'homeId', event.target.value)}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name || 'Unnamed'}
                  </option>
                ))}
              </select>
              <select
                value={game.awayId}
                onChange={(event) => handleGameChange(game.id, 'awayId', event.target.value)}
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name || 'Unnamed'}
                  </option>
                ))}
              </select>
              <select
                value={game.outcome}
                onChange={(event) => handleGameChange(game.id, 'outcome', event.target.value)}
              >
                <option value="TBD">TBD</option>
                <option value="H_REG">Home regulation win</option>
                <option value="A_REG">Away regulation win</option>
                <option value="H_OT">Home OT/SO win</option>
                <option value="A_OT">Away OT/SO win</option>
              </select>
              <input
                type="number"
                min="5"
                max="95"
                value={Math.round(num(game.probHome) * 100)}
                onChange={(event) =>
                  handleGameChange(game.id, 'probHome', num(event.target.value) / 100)
                }
              />
              <button type="button" className="ghost" onClick={() => handleRemoveGame(game.id)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="split">
        <div className="panel">
          <div className="panel-header">
            <h2>Deterministic standings</h2>
            <span className="chip">Only fixed outcomes applied</span>
          </div>
          <div className="cutline-controls">
            <label>
              Tiebreakers
              <select value={tiebreakRule} onChange={(event) => setTiebreakRule(event.target.value)}>
                <option value="shl">SHL style (PTS, ROW, RW, GD, GF)</option>
                <option value="pointsGd">Points + goal diff</option>
              </select>
            </label>
            <label>
              Direct to QF (top)
              <input
                type="number"
                min="0"
                max={teams.length}
                value={directCut}
                onChange={(event) => setDirectCut(num(event.target.value))}
              />
            </label>
            <label>
              Play-in start
              <input
                type="number"
                min="1"
                max={teams.length}
                value={playInStart}
                onChange={(event) => setPlayInStart(num(event.target.value))}
              />
            </label>
            <label>
              Play-in end
              <input
                type="number"
                min="1"
                max={teams.length}
                value={playInEnd}
                onChange={(event) => setPlayInEnd(num(event.target.value))}
              />
            </label>
            <label>
              Relegation start
              <input
                type="number"
                min="1"
                max={teams.length}
                value={relegationStart}
                onChange={(event) => setRelegationStart(num(event.target.value))}
              />
            </label>
          </div>
          <div className="table">
            <div className="row header standings">
              <span>#</span>
              <span>Team</span>
              <span>GP</span>
              <span>PTS</span>
              <span>ROW</span>
              <span>RW</span>
              <span>GD</span>
            </div>
            {deterministicStandings.map((team, index) => {
              const isTarget = team.id === targetTeamId
              const goalDiff = team.gf - team.ga
              const rank = index + 1
              const status =
                rank <= directCut
                  ? 'Direct QF'
                  : rank >= playInStart && rank <= playInEnd
                  ? 'Play-in'
                  : rank >= relegationStart
                  ? 'Relegation'
                  : ''
              return (
                <div className={`row standings ${isTarget ? 'highlight' : ''}`} key={team.id}>
                  <span>{index + 1}</span>
                  <span>
                    {team.name || 'Unnamed'}
                    {status ? <em className="status">{status}</em> : null}
                  </span>
                  <span>{team.gp}</span>
                  <span>{team.pts}</span>
                  <span>{team.row}</span>
                  <span>{team.rw}</span>
                  <span>{goalDiff}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header">
            <h2>Simulation</h2>
            <button type="button" className="primary" onClick={runSimulation}>
              Run simulation
            </button>
          </div>
          <div className="controls">
            <label>
              Iterations
              <input
                type="number"
                min="100"
                max="20000"
                value={iterations}
                onChange={(event) => setIterations(event.target.value)}
              />
            </label>
            <label>
              OT/SO share of wins
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={otShare}
                onChange={(event) => setOtShare(num(event.target.value))}
              />
              <span className="range-value">{Math.round(otShare * 100)}%</span>
            </label>
            <label>
              Home advantage
              <input
                type="range"
                min="-0.2"
                max="0.2"
                step="0.01"
                value={homeAdv}
                onChange={(event) => setHomeAdv(num(event.target.value))}
              />
              <span className="range-value">
                {homeAdv >= 0 ? '+' : ''}
                {Math.round(homeAdv * 100)}%
              </span>
            </label>
          </div>

          {simulation ? (
            <div className="simulation-results">
              <div className="summary-card">
                <h3>{targetTeam?.name || 'Team'} summary</h3>
                <p>Best rank: {simulation.targetSummary.best ?? '—'}</p>
                <p>Worst rank: {simulation.targetSummary.worst ?? '—'}</p>
                <p>
                  Average rank: {simulation.targetSummary.avgRank?.toFixed(2) ?? '—'}
                </p>
                <p>
                  Average points: {simulation.targetSummary.avgPts?.toFixed(1) ?? '—'}
                </p>
                <p className="hint">Based on {simulation.iterations} runs.</p>
              </div>

              <div className="table compact rank">
                <div className="row header standings">
                  <span>Rank</span>
                  <span>Chance</span>
                </div>
                {simulation.rankCounts.map((entry) => (
                  <div className="row standings" key={entry.rank}>
                    <span>{entry.rank}</span>
                    <span>{entry.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div className="table compact expected">
                <div className="row header standings">
                  <span>Team</span>
                  <span>Avg rank</span>
                  <span>Avg pts</span>
                </div>
                {simulation.expected.map((team) => (
                  <div
                    className={`row standings ${team.id === targetTeamId ? 'highlight' : ''}`}
                    key={team.id}
                  >
                    <span>{team.name || 'Unnamed'}</span>
                    <span>{team.avgRank.toFixed(2)}</span>
                    <span>{team.avgPts.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="hint">Run the simulation to see rank distributions and averages.</p>
          )}
        </div>
      </section>
    </div>
  )
}

export default App
