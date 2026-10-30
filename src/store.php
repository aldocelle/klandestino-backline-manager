<?php
declare(strict_types=1);

final class SqlStore
{
    public PDO $db;
    private bool $sqlite;
    public function __construct(array $config)
    {
        $this->db = new PDO($config['dsn'], $config['user'] ?? '', $config['password'] ?? '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $this->sqlite = str_starts_with($config['dsn'], 'sqlite:');
        if ($this->sqlite) $this->db->exec('PRAGMA busy_timeout=5000');
    }
    public function migrate(): void
    {
        $engine = $this->sqlite ? '' : ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';
        $this->db->exec('CREATE TABLE IF NOT EXISTS kb_state (id INTEGER PRIMARY KEY, revision INTEGER NOT NULL, payload LONGTEXT NOT NULL)' . $engine);
        $this->db->exec('CREATE TABLE IF NOT EXISTS kb_users (id VARCHAR(64) PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(190) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL)' . $engine);
        $this->db->exec('CREATE TABLE IF NOT EXISTS kb_sessions (token_hash VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL, csrf VARCHAR(64) NOT NULL, expires_at BIGINT NOT NULL)' . $engine);
        $this->db->exec('CREATE TABLE IF NOT EXISTS kb_auth_attempts (id VARCHAR(64) PRIMARY KEY, attempts INTEGER NOT NULL, reset_at BIGINT NOT NULL)' . $engine);
        $state = seed_state(); $state['assets'] = []; $state['kits'] = []; $state['events'] = []; $state['movements'] = [];
        $sql = $this->sqlite ? 'INSERT OR IGNORE INTO kb_state VALUES (1, 0, ?)' : 'INSERT IGNORE INTO kb_state VALUES (1, 0, ?)';
        $this->db->prepare($sql)->execute([json_encode($state, JSON_THROW_ON_ERROR)]);
    }
    public function read(): array { return json_decode($this->db->query('SELECT payload FROM kb_state WHERE id=1')->fetchColumn(), true, 128, JSON_THROW_ON_ERROR); }
    public function transaction(callable $callback): mixed
    {
        if ($this->sqlite) $this->db->exec('BEGIN IMMEDIATE'); else $this->db->beginTransaction();
        try { $value = $callback(); if ($this->sqlite) $this->db->exec('COMMIT'); else $this->db->commit(); return $value; }
        catch (Throwable $e) { if ($this->sqlite) $this->db->exec('ROLLBACK'); elseif ($this->db->inTransaction()) $this->db->rollBack(); throw $e; }
    }
    public function lockState(): array
    {
        $sql = 'SELECT payload FROM kb_state WHERE id=1' . ($this->sqlite ? '' : ' FOR UPDATE');
        return json_decode($this->db->query($sql)->fetchColumn(), true, 128, JSON_THROW_ON_ERROR);
    }
    public function save(array $state): void
    {
        $this->db->prepare('UPDATE kb_state SET revision=?, payload=? WHERE id=1')->execute([$state['revision'], json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
    }
    public function command(array $cmd, string $actor, int $revision): array
    {
        return $this->transaction(function () use ($cmd, $actor, $revision) {
            $state = $this->lockState();
            if ($state['revision'] !== $revision) throw new DomainError('CONFLICT');
            $next = apply_command($state, $cmd, $actor); $this->save($next); return $next;
        });
    }
    public function authAttempt(string $key): void
    {
        $this->transaction(function () use ($key) {
            $q = $this->db->prepare('SELECT * FROM kb_auth_attempts WHERE id=?' . ($this->sqlite ? '' : ' FOR UPDATE')); $q->execute([$key]); $row = $q->fetch();
            if (!$row) { $this->db->prepare('INSERT INTO kb_auth_attempts VALUES (?, 1, ?)')->execute([$key, time()+900]); return; }
            if ((int)$row['reset_at'] < time()) { $this->db->prepare('UPDATE kb_auth_attempts SET attempts=1, reset_at=? WHERE id=?')->execute([time()+900, $key]); return; }
            require_ok((int)$row['attempts'] < 15, 'Demasiados intentos. Espera 15 minutos.');
            $this->db->prepare('UPDATE kb_auth_attempts SET attempts=attempts+1 WHERE id=?')->execute([$key]);
        });
    }
}
