-- Dummy seed data for a few major stations and junctions
INSERT INTO stations (code, name, state, is_junction, zone) VALUES
('NDLS', 'New Delhi', 'Delhi', true, 'NR'),
('HWH', 'Howrah Junction', 'West Bengal', true, 'ER'),
('CSMT', 'Chhatrapati Shivaji Maharaj Terminus', 'Maharashtra', true, 'CR'),
('MAS', 'MGR Chennai Central', 'Tamil Nadu', true, 'SR'),
('NGP', 'Nagpur Junction', 'Maharashtra', true, 'CR'),
('ET', 'Itarsi Junction', 'Madhya Pradesh', true, 'WCR'),
('BZA', 'Vijayawada Junction', 'Andhra Pradesh', true, 'SCR'),
('PNBE', 'Patna Junction', 'Bihar', true, 'ECR'),
('CDGN', 'Chhindwara Junction', 'Madhya Pradesh', true, 'SECR'),
('CAPE', 'Kanyakumari', 'Tamil Nadu', false, 'SR'),
('BRC', 'Vadodara Junction', 'Gujarat', true, 'WR');

INSERT INTO junction_regions (junction_code, region, priority) VALUES
('NGP', 'Central', 10),
('ET', 'Central', 9),
('BZA', 'South', 8),
('NDLS', 'North', 10),
('HWH', 'East', 10),
('CSMT', 'West', 10);
