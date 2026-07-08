--
-- PostgreSQL database dump
--


-- Dumped from database version 16.10
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: menu_categories; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('appetizer', 'Appetizer', NULL, 1);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('drink', 'Drinks', NULL, 2);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('bento-box', 'Bento Box', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 3);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('hibachi-entrees', 'Hibachi Entrees', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 4);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('hibachi-combo', 'Hibachi Combo', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 5);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('hibachi-special', 'Hibachi Special', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 6);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('hibachi-sides', 'Hibachi Sides', NULL, 7);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('sushi-regular', 'Sushi Regular Roll / Hand Roll', NULL, 8);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('special-roll', 'Special Roll', NULL, 9);
INSERT INTO public.menu_categories (id, name, description, sort_order) VALUES ('deep-fried-roll', 'Deep Fried Roll', NULL, 10);


--
-- Data for Name: menu_items; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU001', 'SKU001', 'Chicken Egg Roll (3 Pcs)', NULL, 'appetizer', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU003', 'SKU003', 'Pork Gyoza (5 Pcs)', NULL, 'appetizer', 5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU004', 'SKU004', 'Shrimp Sumai (5 Pcs)', NULL, 'appetizer', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU007', 'SKU007', 'Soda (Free Refills)', NULL, 'drink', 2.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU008', 'SKU008', 'Bottle Water', NULL, 'drink', 1.25, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU009', 'SKU009', 'Japanese Soda', NULL, 'drink', 2.99, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU010', 'SKU010', 'Chicken Bento', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 'bento-box', 15, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU011', 'SKU011', 'Salmon Bento', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 'bento-box', 16, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU013', 'SKU013', 'Crab Meat Bento', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 'bento-box', 15, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU014', 'SKU014', 'Scallop Bento', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 'bento-box', 17, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU015', 'SKU015', 'Shrimp Bento', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 'bento-box', 16, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU016', 'SKU016', 'Hibachi Vegetables', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 9.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU017', 'SKU017', 'Hibachi Chicken', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 11.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU019', 'SKU019', 'Hibachi Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 13, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU020', 'SKU020', 'Hibachi Scallop', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 14, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU021', 'SKU021', 'Hibachi Salmon', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 13, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU022', 'SKU022', 'Hibachi Crabmeat', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 11.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU023', 'SKU023', 'Hibachi Lobster (1 Tail)', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 16, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU024', 'SKU024', 'Hibachi Steak & Chicken', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU025', 'SKU025', 'Hibachi Steak & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU026', 'SKU026', 'Hibachi Steak & Scallop', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 17.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU027', 'SKU027', 'Hibachi Steak & Crabmeat', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 17, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU028', 'SKU028', 'Hibachi Chicken & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU029', 'SKU029', 'Hibachi Chicken & Scallop', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU030', 'SKU030', 'Hibachi Scallop & Crabmeat', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU031', 'SKU031', 'Hibachi Scallop & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 17, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU032', 'SKU032', 'Hibachi Shrimp & Crabmeat', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU033', 'SKU033', 'Hibachi Crabmeat & Chicken', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-combo', 16.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU034', 'SKU034', 'Side Chicken (6 oz)', NULL, 'hibachi-sides', 7.25, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU035', 'SKU035', 'Side New York Strip (4 oz)', NULL, 'hibachi-sides', 7.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU036', 'SKU036', 'Side Crabmeat', NULL, 'hibachi-sides', 7.25, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU037', 'SKU037', 'Side Salmon (4 oz)', NULL, 'hibachi-sides', 7.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU038', 'SKU038', 'Side Shrimp', NULL, 'hibachi-sides', 7.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU039', 'SKU039', 'Side Scallop', NULL, 'hibachi-sides', 7.75, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU040', 'SKU040', 'Side Lobster (1 Tail)', NULL, 'hibachi-sides', 11, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU041', 'SKU041', 'Side Fried Rice', NULL, 'hibachi-sides', 4.25, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU042', 'SKU042', 'Side Noodle', NULL, 'hibachi-sides', 4.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU043', 'SKU043', 'Side Vegetables', NULL, 'hibachi-sides', 4.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU044', 'SKU044', 'Side Yummy Sauce', NULL, 'hibachi-sides', 0.75, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU045', 'SKU045', 'Samurai Steak (8 oz)', 'Hibachi Combo Special', 'hibachi-special', 19, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU046', 'SKU046', 'Hibachi Steak, Chicken & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 19, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU047', 'SKU047', 'Hibachi Steak, Scallop & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 21, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU048', 'SKU048', 'Hibachi Scallop, Crabmeat & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 20, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU049', 'SKU049', 'Hibachi Lobster & Shrimp', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 23, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU050', 'SKU050', 'Hibachi Lobster & Scallop', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 23, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU051', 'SKU051', 'Hibachi Lobster & Crabmeat', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 22, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU052', 'SKU052', 'Hibachi Lobster 2 Tails (12 oz)', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-special', 30, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU053', 'SKU053', 'California Roll', NULL, 'sushi-regular', 5.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU054', 'SKU054', 'Philadelphia Roll', NULL, 'sushi-regular', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU055', 'SKU055', 'Spicy Salmon Roll', NULL, 'sushi-regular', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU056', 'SKU056', 'Spicy Tuna Roll', NULL, 'sushi-regular', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU057', 'SKU057', 'Salmon Tempura Roll', NULL, 'sushi-regular', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU058', 'SKU058', 'Shrimp Tempura Roll', NULL, 'sushi-regular', 7.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU059', 'SKU059', 'Crab Meat Tempura Roll', NULL, 'sushi-regular', 7, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU060', 'SKU060', 'Spicy Crab Roll', NULL, 'sushi-regular', 7, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU061', 'SKU061', 'Eel Avocado Roll', NULL, 'sushi-regular', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU062', 'SKU062', 'Eel Cucumber Roll', NULL, 'sushi-regular', 6, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU063', 'SKU063', 'Avocado Roll', NULL, 'sushi-regular', 4.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU064', 'SKU064', 'Cucumber Roll', NULL, 'sushi-regular', 4.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU065', 'SKU065', 'Artesian Roll', 'Cucumber, Avocado, Crabstick. Topped: Bake Eel, Avocado, Smoke Salmon, Shrimp', 'special-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU066', 'SKU066', 'Speedzone Nitroroll', 'Spicy Tuna, Tempura Shrimp, Cucumber, Crab Salad. Topped: Spicy Mayo, Sriracha, Sesame seed, Masago', 'special-roll', 14.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU067', 'SKU067', 'Rainbow Roll', 'Crab meat, Cucumber, Avocado. Topped: Tuna, Salmon, Avocado & Shrimp', 'special-roll', 12.99, NULL, true, true);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU070', 'SKU070', 'Crunchy Delight', 'Cream Cheese, Avocado, Spicy Tuna, Shrimp Tempura + Eel Sauce', 'special-roll', 13.95, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU071', 'SKU071', 'Sunrise Roll', 'Shrimp Tempura, Cucumber, Avocado. Topped: Crabmeat, Spicy Mayo, Eel Sauce, Fried Onion', 'special-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU072', 'SKU072', 'Snowman Roll', 'Shrimp Tempura, Crab meat. Topped: Spicy Tuna, Jalapeno & Sriracha', 'special-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU073', 'SKU073', 'Samurai Roll', 'Shrimp Tempura, Spicy Crab (Short Size). Topped: Eel Sauce & Spicy Mayo', 'deep-fried-roll', 12.99, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU074', 'SKU074', 'Crazy Crab Roll', 'Spicy Crab, Cream Cheese. Topped: Sweet Chili Sauce', 'deep-fried-roll', 12.99, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU075', 'SKU075', 'Crazy Lady Roll', 'Smoke Salmon, Cream Cheese, Avocado, Cucumber. Topped: Spicy Mayo & Masago', 'deep-fried-roll', 12.99, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU076', 'SKU076', 'Indiana Roll', 'Soft Shell Crab, Cucumber, Avocado. Topped: Spicy Crab & Spicy Mayo', 'deep-fried-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU077', 'SKU077', 'Red Dragon Roll', 'Spicy Tuna, Avocado, Cream Cheese. Topped: Spicy Mayo & Eel Sauce', 'deep-fried-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU078', 'SKU078', 'New York Roll', 'Jalapeno, Salmon, Avocado, Cream Cheese. Topped: Eel Sauce, Spicy Mayo', 'deep-fried-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU079', 'SKU079', 'Dynamic Roll', 'Avocado, Cucumber, Crabstick, Cream Cheese. Topped: Spicy Crab, Spicy Mayo & Eel Sauce', 'deep-fried-roll', 13.5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU002', 'SKU002', 'Crab Rangoon (4 Pcs)', NULL, 'appetizer', 5, NULL, true, true);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU005', 'SKU005', 'Kani Salad', NULL, 'appetizer', 6, NULL, true, true);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU006', 'SKU006', 'Vegetables Spring Roll (4 Pcs)', NULL, 'appetizer', 5, NULL, true, false);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU012', 'SKU012', 'Steak Bento', 'Includes 4 Pcs California Roll, 2 Pcs Spring Roll, Vegetable Hibachi, Fried Rice, Yummy Sauce', 'bento-box', 16, NULL, true, true);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU018', 'SKU018', 'Hibachi New York Strip', 'All Hibachi Menu Come with Fried Rice, Vegetable & Yummy Sauce', 'hibachi-entrees', 13, NULL, true, true);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU068', 'SKU068', 'Sweet Heart Roll', 'Spicy Crab, Cream Cheese, Cucumber, Shrimp Tempura, Wrapped with Soy Paper. Topped: Mango, Eel Sauce, Spicy Mayo', 'special-roll', 14.5, NULL, true, true);
INSERT INTO public.menu_items (id, sku, name, description, category, price, image_url, available, featured) VALUES ('SKU069', 'SKU069', 'OMG Roll', 'Shrimp Tempura, Avocado, Cream Cheese. Topped: Shredded Crab, Eel Sauce, Spicy Mayo, Crunchy', 'special-roll', 13.99, NULL, true, true);


--
-- PostgreSQL database dump complete
--


