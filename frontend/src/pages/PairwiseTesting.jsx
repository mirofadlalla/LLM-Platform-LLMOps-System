import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Check, Equal, Eye, GitCompareArrows, Loader, Play, RefreshCw, Trophy } from 'lucide-react';
import { abTestService, modelsService, promptService } from '../services/api';
import Modal from '../components/Modal';

const defaultVariables = '{\n  \n}';

const versionLabel = (version) => `${version.version}${version.is_active ? ' (Active)' : ''}`;

const WinnerBadge = ({ winner }) => {
  if (!winner) return <span className="text-xs text-slate-500">Awaiting vote</span>;
  const label = winner === 'tie' ? 'Tie' : `Version ${winner.toUpperCase()}`;
  const classes = winner === 'tie'
    ? 'bg-slate-500/15 text-slate-300 border-slate-500/20'
    : winner === 'a'
      ? 'bg-primary-500/15 text-primary-300 border-primary-500/20'
      : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20';
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${classes}`}>{label}</span>;
};

const PairwiseTesting = () => {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const [promptId, setPromptId] = useState('');
  const [versions, setVersions] = useState([]);
  const [catalog, setCatalog] = useState({});
  const [provider, setProvider] = useState('');
  const [model, setModel] = useState('');
  const [versionA, setVersionA] = useState('');
  const [versionB, setVersionB] = useState('');
  const [variables, setVariables] = useState(defaultVariables);
  const [submitting, setSubmitting] = useState(false);
  const [voteWinner, setVoteWinner] = useState('');
  const [feedback, setFeedback] = useState('');
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState('');

  const fetchTests = useCallback(async () => {
    try {
      setTests(await abTestService.list(0, 100));
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load pairwise evaluations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  useEffect(() => {
    if (!showCreate) return;
    Promise.all([promptService.list(), modelsService.catalog()])
      .then(([promptData, modelData]) => {
        setPrompts(promptData || []);
        setCatalog(modelData || {});
        const firstProvider = Object.keys(modelData || {})[0] || '';
        setProvider(firstProvider);
        setModel(modelData?.[firstProvider]?.[0]?.slug || '');
      })
      .catch((err) => setError(err.friendlyMessage || 'Failed to load test configuration.'));
  }, [showCreate]);

  useEffect(() => {
    if (!promptId) {
      setVersions([]);
      return;
    }
    promptService.listVersions(promptId)
      .then((data) => {
        const nextVersions = data.versions || [];
        setVersions(nextVersions);
        setVersionA(nextVersions[0]?.id || '');
        setVersionB(nextVersions[1]?.id || '');
      })
      .catch((err) => setError(err.friendlyMessage || 'Failed to load prompt versions.'));
  }, [promptId]);

  useEffect(() => {
    if (provider && catalog[provider]) setModel(catalog[provider][0]?.slug || '');
  }, [provider, catalog]);

  const completedCount = useMemo(() => tests.filter((test) => test.winner).length, [tests]);

  const resetForm = () => {
    setPromptId(''); setVersions([]); setVersionA(''); setVersionB('');
    setVariables(defaultVariables); setError('');
  };

  const openTest = async (test) => {
    try {
      setError('');
      setDetail(await abTestService.getById(test.ab_test_id));
      setVoteWinner(''); setFeedback('');
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load evaluation details.');
    }
  };

  const runTest = async (event) => {
    event.preventDefault();
    let parsedVariables;
    try {
      parsedVariables = JSON.parse(variables);
    } catch {
      setError('Input variables must be valid JSON.');
      return;
    }
    if (!versionA || !versionB || versionA === versionB) {
      setError('Select two different prompt versions.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const result = await abTestService.run({
        version_a_id: versionA, version_b_id: versionB, variables: parsedVariables, provider, model,
      });
      setShowCreate(false);
      resetForm();
      setDetail({ ...result, winner: null, feedback: null, voted_at: null, query: JSON.stringify(parsedVariables) });
      await fetchTests();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to run the pairwise evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  const castVote = async (winner) => {
    if (!detail || detail.winner) return;
    setVoting(true); setError('');
    try {
      const result = await abTestService.vote(detail.ab_test_id, { winner, feedback: feedback || undefined });
      setDetail((current) => ({ ...current, ...result }));
      await fetchTests();
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to record your vote.');
    } finally {
      setVoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && <div role="alert" className="toast alert alert-error animate-slide-in">{error}</div>}
      <div className="page-header animate-fade-in">
        <div>
          <h1 className="page-title">Pairwise Testing</h1>
          <p className="page-subtitle">Compare two prompt versions against the same input, then record the winner.</p>
        </div>
        <div className="page-actions">
          <button onClick={fetchTests} className="btn-secondary"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <button onClick={() => { resetForm(); setShowCreate(true); }} className="btn-primary"><GitCompareArrows className="h-4 w-4" /> New comparison</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <div className="glass-card rounded-2xl p-5"><p className="label-caps">Total comparisons</p><p className="mt-2 text-2xl font-bold text-white">{tests.length}</p></div>
        <div className="glass-card rounded-2xl p-5"><p className="label-caps">Decisions recorded</p><p className="mt-2 text-2xl font-bold text-emerald-400">{completedCount}</p></div>
        <div className="glass-card rounded-2xl p-5"><p className="label-caps">Awaiting review</p><p className="mt-2 text-2xl font-bold text-amber-400">{tests.length - completedCount}</p></div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="card-header"><div><h2 className="card-title">Comparison history</h2><p className="card-subtitle">Newest pairwise evaluations first</p></div></div>
        <div className="overflow-x-auto">
          <table className="table-dark">
            <thead><tr><th>Versions</th><th>Model</th><th>Decision</th><th>Created</th><th /></tr></thead>
            <tbody>
              {loading ? [...Array(4)].map((_, index) => <tr key={index}><td colSpan="5"><div className="h-4 skeleton rounded w-full" /></td></tr>) :
                tests.length === 0 ? <tr><td colSpan="5"><p className="empty-note py-8">No comparisons yet. Run your first pairwise test to evaluate a prompt change.</p></td></tr> :
                  tests.map((test) => <tr key={test.ab_test_id}>
                    <td><span className="font-mono text-xs text-primary-300">A: {test.version_a_id?.slice(0, 8)}</span><span className="mx-2 text-slate-600">vs</span><span className="font-mono text-xs text-cyan-300">B: {test.version_b_id?.slice(0, 8)}</span></td>
                    <td><span className="text-sm text-slate-300">{test.provider} / {test.model}</span></td>
                    <td><WinnerBadge winner={test.winner} /></td>
                    <td><span className="text-xs text-slate-400">{test.created_at ? formatDistanceToNow(new Date(test.created_at), { addSuffix: true }) : '—'}</span></td>
                    <td><button onClick={() => openTest(test)} className="btn-ghost btn-sm"><Eye className="h-3.5 w-3.5" /> Review</button></td>
                  </tr>)
              }
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New Pairwise Comparison" size="lg">
        <form onSubmit={runTest} className="space-y-5">
          <div><label className="field-label">Prompt</label><select required value={promptId} onChange={(event) => setPromptId(event.target.value)} className="input-dark w-full"><option value="">Choose a prompt...</option>{prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}</option>)}</select></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="field-label">Version A</label><select required value={versionA} onChange={(event) => setVersionA(event.target.value)} className="input-dark w-full" disabled={!versions.length}><option value="">Choose version A...</option>{versions.map((version) => <option key={version.id} value={version.id}>{versionLabel(version)}</option>)}</select></div>
            <div><label className="field-label">Version B</label><select required value={versionB} onChange={(event) => setVersionB(event.target.value)} className="input-dark w-full" disabled={!versions.length}><option value="">Choose version B...</option>{versions.map((version) => <option key={version.id} value={version.id}>{versionLabel(version)}</option>)}</select></div>
          </div>
          {promptId && versions.length < 2 && <p className="text-sm text-amber-300">Create a second version before starting a comparison.</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="field-label">Provider</label><select value={provider} onChange={(event) => setProvider(event.target.value)} className="input-dark w-full">{Object.keys(catalog).map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <div><label className="field-label">Model</label><select value={model} onChange={(event) => setModel(event.target.value)} className="input-dark w-full">{(catalog[provider] || []).map((item) => <option key={item.slug} value={item.slug}>{item.display_name || item.slug}</option>)}</select></div>
          </div>
          <div><label className="field-label">Input Variables (JSON)</label><textarea value={variables} onChange={(event) => setVariables(event.target.value)} className="input-dark w-full font-mono" rows={6} required /></div>
          <div className="modal-actions"><button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button><button type="submit" disabled={submitting || !model} className="btn-primary">{submitting ? <><Loader className="h-4 w-4 animate-spin" /> Running both versions...</> : <><Play className="h-4 w-4" /> Run comparison</>}</button></div>
        </form>
      </Modal>

      <Modal isOpen={!!detail} onClose={() => setDetail(null)} title="Pairwise Evaluation" size="xl">
        {detail && <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400"><span className="font-mono">{detail.ab_test_id}</span><span>{detail.provider} / {detail.model}</span><WinnerBadge winner={detail.winner} /></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[['a', detail.answer_a, 'Version A', 'primary'], ['b', detail.answer_b, 'Version B', 'cyan']].map(([key, answer, label, color]) => <div key={key} className={`rounded-2xl border p-4 ${color === 'primary' ? 'border-primary-500/20 bg-primary-500/5' : 'border-cyan-500/20 bg-cyan-500/5'}`}><div className="mb-3 flex items-center justify-between"><p className="font-semibold text-white">{label}</p>{detail.winner === key && <Trophy className="h-4 w-4 text-amber-400" />}</div><pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-300 max-h-80 overflow-y-auto">{answer}</pre></div>)}
          </div>
          {!detail.winner ? <div className="section-divider"><p className="section-title"><Trophy className="h-4 w-4 text-amber-400" /> Choose the stronger answer</p><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} className="input-dark w-full" rows={3} placeholder="Optional feedback for this decision" /><div className="mt-3 flex flex-wrap gap-2"><button disabled={voting} onClick={() => castVote('a')} className="btn-primary"><Check className="h-4 w-4" /> Version A wins</button><button disabled={voting} onClick={() => castVote('b')} className="btn-secondary text-cyan-300"><Check className="h-4 w-4" /> Version B wins</button><button disabled={voting} onClick={() => castVote('tie')} className="btn-secondary"><Equal className="h-4 w-4" /> Tie</button></div></div> : <div className="section-divider"><p className="field-label">Decision feedback</p><p className="text-sm text-slate-300">{detail.feedback || 'No feedback was added.'}</p></div>}
        </div>}
      </Modal>
    </div>
  );
};

export default PairwiseTesting;
