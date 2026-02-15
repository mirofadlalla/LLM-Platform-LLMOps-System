import React, { useEffect, useState, useMemo } from 'react';
import { promptService } from '../services/api';
import { format } from 'date-fns';
import {
  Terminal, Plus, GitBranch, TestTube, Star, Play, Search,
  SortAsc, SortDesc, ChevronDown, Copy, Eye, Trash2, ArrowUpDown
} from 'lucide-react';
import Modal from '../components/Modal';
import RunPromptModal from '../components/RunPromptModal';
import GoldenExamples from '../components/GoldenExamples';
import EvaluationResults from '../components/EvaluationResults';

const Prompts = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [evaluationVersion, setEvaluationVersion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [diffFromVersion, setDiffFromVersion] = useState('');
  const [diffToVersion, setDiffToVersion] = useState('');
  const [notification, setNotification] = useState(null);

  const [newPrompt, setNewPrompt] = useState({ name: '', description: '', template: '' });
  const [newVersion, setNewVersion] = useState({ template: '' });

  useEffect(() => { fetchPrompts(); }, []);

  const showToast = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const data = await promptService.list();
      setPrompts(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to load prompts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrompts = useMemo(() => {
    let result = [...prompts];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [prompts, searchQuery, sortField, sortDir]);

  const handleCreatePrompt = async (e) => {
    e.preventDefault();
    try {
      await promptService.create(newPrompt);
      setShowCreateModal(false);
      setNewPrompt({ name: '', description: '', template: '' });
      fetchPrompts();
      showToast('Prompt created successfully');
    } catch (err) {
      showToast('Failed to create prompt', 'error');
    }
  };

  const handleViewVersions = async (prompt) => {
    setSelectedPrompt(prompt);
    try {
      const data = await promptService.listVersions(prompt.id);
      setVersions(data.versions || []);
      setShowVersionsModal(true);
    } catch (err) {
      showToast('Failed to load versions', 'error');
    }
  };

  const handleCreateVersion = async (e) => {
    e.preventDefault();
    try {
      await promptService.createVersion(selectedPrompt.id, newVersion);
      setNewVersion({ template: '' });
      handleViewVersions(selectedPrompt);
      showToast('New version created');
    } catch (err) {
      showToast('Failed to create version', 'error');
    }
  };

  const handleActivateVersion = async (versionId) => {
    try {
      await promptService.activateVersion(selectedPrompt.id, versionId);
      handleViewVersions(selectedPrompt);
      showToast('Version activated');
    } catch (err) {
      showToast('Failed to activate version', 'error');
    }
  };

  const handleEvaluate = (version) => {
    setEvaluationVersion(version);
    setShowEvaluationModal(true);
  };

  const handleDiff = async () => {
    if (!diffFromVersion || !diffToVersion) {
      showToast('Please select both versions to compare', 'error');
      return;
    }
    try {
      const result = await promptService.diff(selectedPrompt.id, diffFromVersion, diffToVersion);
      setDiffResult(result);
      setShowDiffModal(true);
    } catch (err) {
      showToast('Failed to generate diff', 'error');
    }
  };

  const handleRunPrompt = (version) => {
    setSelectedVersion(version);
    setShowRunModal(true);
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Template variable extraction
  const extractVariables = (template) => {
    const matches = template.match(/\{([^}]+)\}/g);
    return matches ? [...new Set(matches.map(m => m.slice(1, -1)))] : [];
  };

  const previewVariables = extractVariables(newPrompt.template);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-2xl animate-slide-in text-sm font-medium flex items-center gap-2 ${
          notification.type === 'error'
            ? 'bg-red-500/20 border border-red-500/30 text-red-300'
            : 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 animate-fade-in">
        <div>
          <h2 className="text-2xl font-bold text-white">Prompts</h2>
          <p className="text-sm text-slate-400 mt-1">{prompts.length} prompt{prompts.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create Prompt
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search prompts by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => toggleSort('name')}
            className={`btn-ghost flex items-center gap-1.5 text-xs ${sortField === 'name' ? 'text-primary-400' : ''}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Name
          </button>
          <button
            onClick={() => toggleSort('created_at')}
            className={`btn-ghost flex items-center gap-1.5 text-xs ${sortField === 'created_at' ? 'text-primary-400' : ''}`}
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> Date
          </button>
        </div>
      </div>

      {/* Prompts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 skeleton rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPrompts.map((prompt, i) => (
            <div
              key={prompt.id}
              className="glass-card rounded-2xl overflow-hidden animate-fade-in opacity-0"
              style={{ animationDelay: `${0.05 * i}s` }}
            >
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <Terminal className="h-5 w-5 text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{prompt.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{prompt.description || 'No description'}</p>
                  </div>
                </div>
                {prompt.created_at && (
                  <p className="text-[11px] text-slate-600 mt-3">
                    Created {format(new Date(prompt.created_at), 'MMM dd, yyyy')}
                  </p>
                )}
              </div>
              <div className="px-5 py-3 border-t border-white/5 bg-white/[0.015] flex flex-wrap gap-2">
                <button
                  onClick={() => handleViewVersions(prompt)}
                  className="text-xs font-medium text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
                >
                  <GitBranch className="h-3 w-3" /> Versions
                </button>
                <button
                  onClick={() => { setSelectedPrompt(prompt); handleViewVersions(prompt); }}
                  className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  <Eye className="h-3 w-3" /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredPrompts.length === 0 && !loading && (
        <div className="text-center py-16 animate-fade-in">
          <Terminal className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">
            {searchQuery ? 'No prompts match your search' : 'No prompts yet'}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {searchQuery ? 'Try different keywords' : 'Create your first prompt to get started'}
          </p>
        </div>
      )}

      {/* ===== CREATE PROMPT MODAL ===== */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Prompt" size="lg">
        <form onSubmit={handleCreatePrompt} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Name *</label>
            <input
              type="text"
              value={newPrompt.name}
              onChange={(e) => setNewPrompt({...newPrompt, name: e.target.value})}
              className="input-dark w-full"
              required
              placeholder="e.g., Text Summarizer"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
            <input
              type="text"
              value={newPrompt.description}
              onChange={(e) => setNewPrompt({...newPrompt, description: e.target.value})}
              className="input-dark w-full"
              placeholder="Brief description of the prompt's purpose"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Template (v1) *</label>
            <textarea
              value={newPrompt.template}
              onChange={(e) => setNewPrompt({...newPrompt, template: e.target.value})}
              className="input-dark w-full font-mono text-sm"
              rows={6}
              required
              placeholder={'Summarize the following text:\n{text}'}
            />
            {previewVariables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-slate-500">Variables:</span>
                {previewVariables.map(v => (
                  <span key={v} className="badge badge-active text-[10px]">{`{${v}}`}</span>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          {newPrompt.template && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Preview</label>
              <div className="code-block text-xs">
                {newPrompt.template.replace(/\{(\w+)\}/g, (_, v) => `<${v}>`)}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">Create Prompt</button>
          </div>
        </form>
      </Modal>

      {/* ===== VERSIONS MODAL ===== */}
      <Modal isOpen={showVersionsModal} onClose={() => setShowVersionsModal(false)} title={`Versions: ${selectedPrompt?.name}`} size="xl">
        <div className="space-y-6">
          {/* Version List */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Version History</h4>
            <div className="space-y-3">
              {versions.map((version, i) => (
                <div
                  key={version.id}
                  className={`rounded-xl border p-4 transition-all ${
                    version.is_active
                      ? 'border-primary-500/30 bg-primary-500/5'
                      : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white">{version.version}</span>
                        {version.is_active && (
                          <span className="badge badge-success">Active</span>
                        )}
                        {version.created_at && (
                          <span className="text-[11px] text-slate-500">
                            {format(new Date(version.created_at), 'MMM dd, yyyy HH:mm')}
                          </span>
                        )}
                      </div>
                      <pre className="code-block text-xs mt-2 max-h-24 overflow-hidden">{version.template}</pre>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!version.is_active && (
                      <button
                        onClick={() => handleActivateVersion(version.id)}
                        className="btn-ghost text-xs text-primary-400 hover:text-primary-300"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleEvaluate(version)}
                      className="btn-ghost text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <TestTube className="h-3 w-3" /> Evaluate
                    </button>
                    <button
                      onClick={() => handleRunPrompt(version)}
                      className="btn-ghost text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <Play className="h-3 w-3" /> Run
                    </button>
                    <button
                      onClick={() => navigator.clipboard.writeText(version.id)}
                      className="btn-ghost text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
                    >
                      <Copy className="h-3 w-3" /> Copy ID
                    </button>
                  </div>
                </div>
              ))}
              {versions.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">No versions found</p>
              )}
            </div>
          </div>

          {/* Create New Version */}
          <div className="border-t border-white/5 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary-400" /> Create New Version
            </h4>
            <form onSubmit={handleCreateVersion} className="space-y-3">
              <textarea
                value={newVersion.template}
                onChange={(e) => setNewVersion({ template: e.target.value })}
                className="input-dark w-full font-mono text-sm"
                rows={4}
                required
                placeholder="Enter new template..."
              />
              <button type="submit" className="btn-primary w-full">Create Version</button>
            </form>
          </div>

          {/* Golden Examples */}
          <div className="border-t border-white/5 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" /> Golden Examples
            </h4>
            <GoldenExamples promptId={selectedPrompt?.id} />
          </div>

          {/* Version Diff */}
          <div className="border-t border-white/5 pt-5">
            <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-400" /> Compare Versions
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">From</label>
                <select
                  value={diffFromVersion}
                  onChange={(e) => setDiffFromVersion(e.target.value)}
                  className="input-dark w-full"
                >
                  <option value="">Select version</option>
                  {versions.map(v => <option key={v.id} value={v.id}>{v.version}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">To</label>
                <select
                  value={diffToVersion}
                  onChange={(e) => setDiffToVersion(e.target.value)}
                  className="input-dark w-full"
                >
                  <option value="">Select version</option>
                  {versions.map(v => <option key={v.id} value={v.id}>{v.version}</option>)}
                </select>
              </div>
            </div>
            <button onClick={handleDiff} className="btn-secondary w-full mt-3 flex items-center justify-center gap-2">
              <GitBranch className="h-4 w-4" /> Show Diff
            </button>
          </div>
        </div>
      </Modal>

      {/* ===== DIFF MODAL ===== */}
      <Modal isOpen={showDiffModal} onClose={() => setShowDiffModal(false)} title="Version Comparison" size="lg">
        {diffResult && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span>From: <span className="text-white font-medium">{diffResult.from_version_id?.slice(0, 8)}...</span></span>
              <span>→</span>
              <span>To: <span className="text-white font-medium">{diffResult.to_version_id?.slice(0, 8)}...</span></span>
            </div>
            <div className="code-block text-xs space-y-0.5">
              {(diffResult.diff || []).map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.startsWith('+') ? 'diff-add py-0.5' :
                    line.startsWith('-') ? 'diff-remove py-0.5' :
                    'diff-neutral py-0.5'
                  }
                >
                  {line}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  const blob = new Blob([JSON.stringify(diffResult, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'diff.json';
                  a.click();
                }}
                className="btn-ghost text-xs"
              >
                Export JSON
              </button>
              <button onClick={() => setShowDiffModal(false)} className="btn-primary">Close</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Run Prompt Modal */}
      <RunPromptModal
        isOpen={showRunModal}
        onClose={() => setShowRunModal(false)}
        prompt={selectedPrompt}
        version={selectedVersion}
      />

      {/* Evaluation Results Modal */}
      <EvaluationResults
        promptId={selectedPrompt?.id}
        versionId={evaluationVersion?.id}
        isOpen={showEvaluationModal}
        onClose={() => setShowEvaluationModal(false)}
      />
    </div>
  );
};

export default Prompts;
