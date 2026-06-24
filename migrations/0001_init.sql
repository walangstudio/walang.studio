CREATE TABLE words (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL UNIQUE
);

CREATE TABLE news (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  date     TEXT NOT NULL,
  headline TEXT NOT NULL,
  body     TEXT NOT NULL,
  sort     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE apps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  label       TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL
);

CREATE TABLE games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  badge       TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL
);

INSERT INTO words (text) VALUES
('kwenta'),('trabaho'),('pera'),('magawa'),('makain'),('silbi'),('dahilan'),
('katuwiran'),('kinabukasan'),('katinuan'),('tulong'),('pangarap'),('masabi'),('layunin'),
('kalayaan'),('saysay'),('pagasa'),('lakas'),('buhay'),('patutunguhan'),
('tulugan'),('galang'),('emosyon'),('kasama'),('karapatan'),('pagkakataon');

INSERT INTO news (date, headline, body, sort) VALUES
('March, 1926','Studio Announces New Season of Productions','The studio has confirmed a full slate of moving pictures for the forthcoming year. Titles include works of drama, comedy, and spectacle. Details to follow in due course.',4),
('February, 1926','The Projector Has Been Repaired','After a lengthy intermission, the apparatus is once again operational. We apologise for the inconvenience and thank our audience for their patience.',3),
('January, 1926','First Moving Picture Completed','The studio is pleased to announce the completion of its inaugural production. Screenings will commence at the earliest opportunity.',2),
('December, 1925','Studio Established in the City','walang.studio has opened its doors. The founders have expressed great ambition for the venture and expect to produce works of lasting significance.',1);

INSERT INTO apps (label, title, description, status) VALUES
('APP I','The Communicator','A most remarkable device for the transmission of messages across great distances. Correspondence delivered with mechanical precision.','AVAILABLE'),
('APP II','The Ledger','Accounts kept with unfailing accuracy and great dignity. Every transaction recorded, nothing forgotten.','AVAILABLE'),
('APP III','The Cartographer','Charting territories known and unknown. A guide for the modern explorer of digital realms.','IN DEVELOPMENT');

INSERT INTO games (badge, title, description) VALUES
('NOW PLAYING','The Grand Puzzle','A diversion of the highest order. Test your faculties against an apparatus of considerable ingenuity. Suitable for all ages of discerning mind.'),
('COMING SOON','The Mystery of Room 7','An interactive drama of the thriller variety. The culprit lurks among the guests. Your deduction is required.'),
('COMING SOON','The Automaton','A mechanical man requires your guidance through a world of gears and consequence. Philosophy disguised as amusement.');
