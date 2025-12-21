import { Request } from "express";
import { DeletedStatus, SingleProductType } from "../../utils/app-enumeration";
import { QueryTypes } from "sequelize";
import { resSuccess } from "../../utils/shared-functions";
import dbContext from "../../config/db-context";

export const dynamicProductExport = async (req: Request) => {
  try {
  
    const products = await dbContext.query(
      `WITH ranked AS (
    SELECT 
        products.id AS product_id,
        PMO.id AS PMO_ID,
		CASE WHEN cat.category_name IS NULL THEN '' ELSE cat.category_name END as category,
		CASE WHEN sub_cat.category_name IS NULL THEN '' ELSE sub_cat.category_name END as sub_category,
		CASE WHEN sub_sub_cat.category_name IS NOT NULL THEN sub_sub_cat.category_name ELSE '' END as sub_sub_category,
		CASE WHEN products.name IS NOT NULL THEN products.name ELSE '' END AS name,
        CASE WHEN products.sku IS NOT NULL THEN products.sku ELSE '' END AS sku,
        CASE WHEN pp.sku IS NOT NULL THEN pp.sku ELSE '' END AS parent_sku,
        CASE WHEN products.meta_title IS NOT NULL THEN products.meta_title ELSE '' END AS meta_title,
        CASE WHEN products.meta_description IS NOT NULL THEN products.meta_description ELSE '' END AS meta_description,
        CASE WHEN products.meta_tag IS NOT NULL THEN products.meta_tag ELSE '' END AS meta_tag,
        cASE WHEN products.is_customization = '1' THEN TRUE ELSE FALSE END AS is_customization,
        CASE WHEN products.id_collection IS NOT NULL THEN (SELECT STRING_AGG(name, ' | ') FROM collections WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.id_collection, '|', ','), ',')::INTEGER[])) ELSE '' END AS collection,
        CASE WHEN products.tag IS NOT NULL THEN (SELECT STRING_AGG(name, ' | ') FROM tags WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.tag, '|', ','), ',')::INTEGER[])) ELSE '' END AS tag,
        CASE WHEN products.sort_description IS NOT NULL THEN products.sort_description  ELSE '' END AS short_description,
        CASE WHEN  products.long_description IS NOT NULL THEN products.long_description ELSE '' END AS long_description,
        CASE WHEN  products.making_charge IS NOT NULL THEN products.making_charge::text ELSE '' END AS labour_charge,
        CASE WHEN products.finding_charge IS NOT NULL THEN products.finding_charge::text ELSE '' END AS finding_charge,
        CASE WHEN products.other_charge IS NOT NULL THEN products.other_charge::text ELSE '' END AS other_charge,
		CASE WHEN metal.name IS NOT NULL THEN metal.name ELSE '' END AS metal,
        CASE WHEN karat.name IS NOT NULL THEN karat.name::text ELSE '' END AS karat,
        CASE WHEN pmo.id_metal_tone IS NOT NULL THEN (SELECT STRING_AGG(metal_tones.sort_code, '|') FROM metal_tones WHERE id = ANY(STRING_TO_ARRAY(REPLACE(pmo.id_metal_tone, '|', ','), ',')::INTEGER[])) ELSE '' END AS metal_tone,
        CASE WHEN pmo.metal_weight IS NOT NULL THEN pmo.metal_weight::text ELSE '' END AS metal_weight,
        CASE WHEN pmo.quantity IS NOT NULL THEN pmo.quantity::text ELSE '' END AS quantity,
		CASE WHEN pmo.id_karat IS NULL THEN metal.metal_rate*pmo.metal_weight ELSE (metal.metal_rate/metal.calculate_rate*karat.calculate_rate)*pmo.metal_weight END as metal_price,
		CASE WHEN products.gender IS NOT NULL THEN CASE 
            WHEN products.gender = '1' THEN 'male' 
            WHEN products.gender = '2' THEN 'female' 
            WHEN products.gender = '3' THEN 'unisex' 
            ELSE NULL 
        END ELSE '' END AS gender,
        products.additional_detail AS additional_detail,
        products.certificate AS certification,
        products.shipping_day AS shipping_days,
        (SELECT STRING_AGG(name, '|') FROM setting_styles WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.setting_style_type, '|', ','), ',')::INTEGER[])) AS setting_style_type,
        (SELECT STRING_AGG(size, '|') FROM items_sizes WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.size, '|', ','), ',')::INTEGER[])) AS size,
        (SELECT STRING_AGG(length, '|') FROM items_lengths WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.length, '|', ','), ',')::INTEGER[])) AS length,
		ROW_NUMBER() OVER (PARTITION BY products.id ORDER BY pc.id) AS pcrn,
        ROW_NUMBER() OVER (PARTITION BY products.id ORDER BY PMO.id) AS pmrn
    FROM products
    LEFT JOIN product_metal_options AS PMO 
        ON PMO.id_product = products.id 
        AND PMO.is_deleted = '0'
	LEFT JOIN product_categories AS pc ON pc.id_product = products.id AND pc.is_deleted = '0'
    LEFT JOIN categories AS cat ON cat.id = pc.id_category
    LEFT JOIN categories AS sub_cat ON sub_cat.id = pc.id_sub_category
    LEFT JOIN categories AS sub_sub_cat ON sub_sub_cat.id = pc.id_sub_sub_category
	LEFT JOIN metal_masters AS metal ON metal.id = pmo.id_metal
    LEFT JOIN gold_kts AS karat ON karat.id = pmo.id_karat
	LEFT JOIN products AS pp ON pp.id = products.parent_id
    WHERE products.is_deleted = '0' AND products.product_type IN (1,3) 
),
diamond_ranked AS (
    SELECT 
        products.id AS product_id,
        PDO.id AS PDO_ID,
		stone.name AS stone,
        shape.name AS shape,
        mm.value AS mm_size,
        col.value AS color,
        cla.value AS clarity,
        cut.value AS cut,
        CASE 
            WHEN pdo.id_type = 1 THEN 'centre' 
            WHEN pdo.id_type = 2 THEN 'side' 
            ELSE NULL 
        END AS stone_type,
        setting.name AS stone_setting,
        pdo.weight AS stone_weight,
        pdo.count AS stone_count,
		CASE WHEN DGM.rate IS NOT NULL AND DGM.rate != 0 THEN DGM.rate ELSE DGM.synthetic_rate END * pdo.weight*pdo.count as diamond_price,
        ROW_NUMBER() OVER (PARTITION BY products.id ORDER BY PDO.id) AS pdrn
    FROM products
    LEFT JOIN product_diamond_options AS PDO 
        ON PDO.id_product = products.id 
        AND PDO.is_deleted = '0'
	INNER JOIN diamond_group_masters AS DGM ON DGM.id = pdo.id_diamond_group
    LEFT JOIN gemstones AS stone ON stone.id = DGM.id_stone
    LEFT JOIN setting_styles AS setting ON setting.id = pdo.id_setting
    LEFT JOIN diamond_shapes AS shape ON shape.id = DGM.id_shape
    LEFT JOIN mm_sizes AS mm ON mm.id = DGM.id_mm_size
    LEFT JOIN colors AS col ON col.id = DGM.id_color
    LEFT JOIN clarities AS cla ON cla.id = DGM.id_clarity
    LEFT JOIN cuts AS cut ON cut.id = DGM.id_cuts
    WHERE products.is_deleted = '0' AND products.product_type IN (1,3) 
),
diamond_totals AS (
    SELECT 
        products.id AS product_id,
        SUM(
            CASE WHEN DGM.rate IS NOT NULL AND DGM.rate != 0 
                 THEN DGM.rate ELSE DGM.synthetic_rate END 
                 * pdo.weight * pdo.count
        ) AS total_diamond_price
    FROM products
    LEFT JOIN product_diamond_options AS PDO 
        ON PDO.id_product = products.id 
        AND PDO.is_deleted = '0'
    INNER JOIN diamond_group_masters AS DGM 
        ON DGM.id = pdo.id_diamond_group
    WHERE products.is_deleted = '0' 
      AND products.product_type IN (1,3) 
      
    GROUP BY products.id
)

SELECT 
    
    CASE WHEN pmrn = 1 then 1 ELSE 0  END as parent_id,
 CASE WHEN pmrn = 1 THEN category ELSE '' END as category,
	CASE WHEN pmrn = 1 THEN sub_category ELSE '' END as sub_category,
	CASE WHEN pmrn = 1 THEN sub_sub_category ELSE '' END AS sub_sub_category,
	CASE WHEN pmrn = 1 THEN name ELSE '' END AS name,
    CASE WHEN pmrn = 1 THEN sku ELSE '' END AS sku,
 	CASE WHEN pmrn = 1 THEN parent_sku ELSE '' END AS parent_sku,
 	CASE WHEN pmrn = 1 THEN is_customization::text ELSE ''  END AS is_customization,
 	CASE WHEN pmrn = 1 THEN collection ELSE '' END AS collection,
 	CASE WHEN pmrn = 1 THEN tag ELSE '' END AS tag,
 	CASE WHEN pmrn = 1 THEN short_description ELSE '' END AS short_description,
 	CASE WHEN pmrn = 1 THEN long_description ELSE '' END AS long_description,
 	CASE WHEN pmrn = 1 THEN CASE WHEN labour_charge IS NULL THEN '' ELSE labour_charge::text END ELSE ''  END AS labour_charge,
 	CASE WHEN pmrn = 1 THEN finding_charge  ELSE '' END AS finding_charge,
 	CASE WHEN pmrn = 1 THEN other_charge ELSE '' END  AS other_charge,
 	CASE WHEN pmrn = 1 THEN setting_style_type ELSE '' END AS setting_style_type,
 	CASE WHEN pmrn = 1 THEN CASE WHEN size IS NOT NULL THEN size ELSE '' END ELSE '' END AS size,
 	CASE WHEN pmrn = 1 THEN CASE WHEN length IS NOT NULL THEN length ELSE '' END ELSE '' END AS length,
	CASE WHEN metal IS NOT NULL THEN metal ELSE '' END AS metal,
	CASE WHEN karat IS NOT NULL THEN karat ELSE '' END AS karat,
	CASE WHEN metal_tone IS NOT NULL THEN metal_tone ELSE '' END AS metal_tone,
	CASE WHEN metal_weight IS NOT NULL THEN metal_weight ELSE '' END AS	metal_weight,
	CASE WHEN quantity IS NOT NULL THEN quantity ELSE '' END AS	quantity,
	CASE WHEN metal_price IS NOT NULL THEN ROUND(metal_price::numeric, 2)::text  ELSE '' END AS metal_price,
	CASE WHEN d.stone IS NOT NULL THEN d.stone ELSE '' END AS stone,
	CASE WHEN d.shape IS NOT NULL THEN d.shape ELSE '' END AS shape	,
	CASE WHEN mm_size IS NOT NULL THEN mm_size ELSE '' END as mm_size,
	CASE WHEN color IS NOT NULL THEN color ELSE '' END	color,
	CASE WHEN clarity IS NOT NULL THEN clarity ELSE '' END clarity,
	CASE WHEN cut IS NOT NULL THEN cut ELSE '' END cut,
	CASE WHEN stone_type IS NOT NULL THEN stone_type ELSE '' END stone_type,
	CASE WHEN stone_setting IS NOT NULL THEN stone_setting ELSE '' END stone_setting,
	CASE WHEN stone_weight IS NOT NULL THEN stone_weight::text ELSE '' END stone_weight,
	CASE WHEN stone_count IS NOT NULL THEN stone_count::text ELSE '' END stone_count,
	CASE WHEN diamond_price IS NOT NULL THEN ROUND(diamond_price::numeric,2)::text ELSE '' END diamond_price,
	CASE WHEN metal_price IS NOT NULL THEN CEIL(ROUND(metal_price::numeric, 2)+ROUND(dt.total_diamond_price::numeric, 2)
	+finding_charge::numeric+other_charge::numeric+labour_charge::numeric)::text  ELSE '' END AS total_product_price,
	CASE WHEN pmrn = 1 THEN CASE WHEN gender IS NOT NULL THEN gender ELSE '' END ELSE '' END AS gender,
	CASE WHEN pmrn = 1 THEN CASE WHEN additional_detail IS NOT NULL THEN additional_detail ELSE '' END ELSE '' END AS additional_detail,
	CASE WHEN pmrn = 1 THEN CASE WHEN certification IS NOT NULL THEN certification ELSE '' END ELSE '' END AS certification,
	CASE WHEN pmrn = 1 THEN CASE WHEN shipping_days IS NOT NULL THEN shipping_days::text ELSE '' END ELSE '' END AS shipping_days,
	CASE WHEN r.meta_title IS NOT NULL THEN r.meta_title ELSE '' END AS meta_title,
    CASE WHEN r.meta_description IS NOT NULL THEN r.meta_description ELSE '' END AS meta_description,
    CASE WHEN r.meta_tag IS NOT NULL THEN r.meta_tag ELSE '' END AS meta_tag
FROM ranked r
LEFT JOIN diamond_ranked d 
    ON r.product_id = d.product_id 
    AND r.pmrn = d.pdrn  
LEFT JOIN diamond_totals dt ON r.product_id = dt.product_id
ORDER BY r.product_id, r.pmrn`,
      { type: QueryTypes.SELECT }
    );

    return resSuccess({ data: products });
  } catch (error) {
    throw error;
  }
};

export const variantProductExport = async (req: Request) => {
  try {

    const products = await dbContext.query(
      `WITH ranked AS (
    SELECT 
        products.id AS product_id,
        PMO.id AS PMO_ID,
		CASE WHEN cat.category_name IS NULL THEN '' ELSE cat.category_name END as category,
		CASE WHEN sub_cat.category_name IS NULL THEN '' ELSE sub_cat.category_name END as sub_category,
		CASE WHEN sub_sub_cat.category_name IS NOT NULL THEN sub_sub_cat.category_name ELSE '' END as sub_sub_category,
		CASE WHEN products.name IS NOT NULL THEN products.name ELSE '' END AS name,
        CASE WHEN products.sku IS NOT NULL THEN products.sku ELSE '' END AS sku,
         CASE WHEN products.meta_title IS NOT NULL THEN products.meta_title ELSE '' END AS meta_title,
        CASE WHEN products.meta_description IS NOT NULL THEN products.meta_description ELSE '' END AS meta_description,
        CASE WHEN products.meta_tag IS NOT NULL THEN products.meta_tag ELSE '' END AS meta_tag,
        CASE WHEN products.id_collection IS NOT NULL THEN (SELECT STRING_AGG(name, ' | ') FROM collections WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.id_collection, '|', ','), ',')::INTEGER[])) ELSE '' END AS collection,
        CASE WHEN id_brand IS NOT NULL THEN brand.name ELSE '' END as brand,
		CASE WHEN products.tag IS NOT NULL THEN (SELECT STRING_AGG(name, ' | ') FROM tags WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.tag, '|', ','), ',')::INTEGER[])) ELSE '' END AS tag,
        CASE WHEN products.sort_description IS NOT NULL THEN products.sort_description  ELSE '' END AS short_description,
        CASE WHEN  products.long_description IS NOT NULL THEN products.long_description ELSE '' END AS long_description,
		CASE WHEN is_quantity_track IS NOT NULL THEN is_quantity_track ELSE FALSE END as is_quantity_track,
		CASE WHEN items_sizes.size IS NOT NULL THEN items_sizes.size ELSE '' END as size,
		CASE WHEN items_lengths.length IS NOT NULL THEN items_lengths.length ELSE '' END as length,
		CASE WHEN metal.name IS NOT NULL THEN metal.name ELSE '' END AS metal,
        CASE WHEN karat.name IS NOT NULL THEN karat.name::text ELSE '' END AS karat,
        CASE WHEN id_m_tone IS NOT NULL THEN metal_tone.sort_code ELSE '' END as metal_tone,
        CASE WHEN pmo.metal_weight IS NOT NULL THEN pmo.metal_weight::text ELSE '' END AS metal_weight,
        CASE WHEN pmo.quantity IS NOT NULL THEN pmo.quantity::text ELSE '' END AS quantity,
		CASE WHEN side_dia_weight IS NOT NULL THEN side_dia_weight::text ELSE '' END as side_dia_weight,
		CASE WHEN side_dia_count IS NOT NULL THEN side_dia_count::text ELSE '' END as side_dia_count,
		CASE WHEN PMO.retail_price IS NOT NULL THEN PMO.retail_price::text ELSE '' END as retail_price,
		CASE WHEN PMO.compare_price IS NOT NULL THEN PMO.compare_price::text ELSE '' END as compare_price,
		CASE WHEN products.gender IS NOT NULL THEN CASE 
            WHEN products.gender = '1' THEN 'male' 
            WHEN products.gender = '2' THEN 'female' 
            WHEN products.gender = '3' THEN 'unisex' 
            ELSE NULL 
        END ELSE '' END AS gender,
        products.additional_detail AS additional_detail,
        products.certificate AS certification,
        products.shipping_day AS shipping_days,
        (SELECT STRING_AGG(name, '|') FROM setting_styles WHERE id = ANY(STRING_TO_ARRAY(REPLACE(products.setting_style_type, '|', ','), ',')::INTEGER[])) AS setting_style_type,
		ROW_NUMBER() OVER (PARTITION BY products.id ORDER BY pc.id) AS pcrn,
        ROW_NUMBER() OVER (PARTITION BY products.id ORDER BY PMO.id) AS pmrn
    FROM products
    LEFT JOIN product_metal_options AS PMO 
        ON PMO.id_product = products.id 
        AND PMO.is_deleted = '0'
	LEFT JOIN items_sizes ON items_sizes.id = PMO.id_size
	LEFT JOIN items_lengths ON items_lengths.id = PMO.id_length
	LEFT JOIN product_categories AS pc ON pc.id_product = products.id AND pc.is_deleted = '0'
    LEFT JOIN categories AS cat ON cat.id = pc.id_category
    LEFT JOIN categories AS sub_cat ON sub_cat.id = pc.id_sub_category
    LEFT JOIN categories AS sub_sub_cat ON sub_sub_cat.id = pc.id_sub_sub_category
	LEFT JOIN metal_masters AS metal ON metal.id = pmo.id_metal
    LEFT JOIN gold_kts AS karat ON karat.id = pmo.id_karat
	LEFT JOIN brands as brand ON brand.id = products.id_brand
	LEFT JOIN metal_tones as metal_tone ON metal_tone.id = PMO.id_m_tone
    WHERE products.is_deleted = '${DeletedStatus.No}' AND products.product_type = ${SingleProductType.VariantType} 
),
diamond_ranked AS (
    SELECT 
        products.id AS product_id,
        PDO.id AS PDO_ID,
		stone.name AS stone,
        shape.name AS shape,
        mm.value AS mm_size,
        col.value AS color,
        cla.value AS clarity,
        cut.value AS cut,
        CASE 
            WHEN pdo.id_type = 1 THEN 'centre' 
            WHEN pdo.id_type = 2 THEN 'side' 
            ELSE NULL 
        END AS stone_type,
        setting.name AS stone_setting,
        pdo.weight AS stone_weight,
        pdo.count AS stone_count,
        ROW_NUMBER() OVER (PARTITION BY products.id ORDER BY PDO.id) AS pdrn
    FROM products
    LEFT JOIN product_diamond_options AS PDO 
        ON PDO.id_product = products.id 
        AND PDO.is_deleted = '0'
    LEFT JOIN gemstones AS stone ON stone.id = PDO.id_stone
    LEFT JOIN setting_styles AS setting ON setting.id = pdo.id_setting
    LEFT JOIN diamond_shapes AS shape ON shape.id = PDO.id_shape
    LEFT JOIN mm_sizes AS mm ON mm.id = PDO.id_mm_size
    LEFT JOIN colors AS col ON col.id = PDO.id_color
    LEFT JOIN clarities AS cla ON cla.id = PDO.id_clarity
    LEFT JOIN cuts AS cut ON cut.id = PDO.id_cut
    WHERE products.is_deleted = '${DeletedStatus.No}' AND products.product_type = ${SingleProductType.VariantType} 
) 
SELECT 
  CASE WHEN r.meta_title IS NOT NULL THEN r.meta_title ELSE '' END AS meta_title,
  CASE WHEN r.meta_description IS NOT NULL THEN r.meta_description ELSE '' END AS meta_description,
  CASE WHEN r.meta_tag IS NOT NULL THEN r.meta_tag ELSE '' END AS meta_tag,
  CASE WHEN pmrn = 1 then 1 ELSE 0  END as parent_id,
 	CASE WHEN pmrn = 1 THEN category ELSE '' END as category,
	CASE WHEN pmrn = 1 THEN sub_category ELSE '' END as sub_category,
	CASE WHEN pmrn = 1 THEN sub_sub_category ELSE '' END AS sub_sub_category,
	CASE WHEN pmrn = 1 THEN name ELSE '' END AS title,
    CASE WHEN pmrn = 1 THEN sku ELSE '' END AS sku,
	CASE WHEN pmrn = 1 THEN brand ELSE '' END as brand,
 	CASE WHEN pmrn = 1 THEN collection ELSE '' END AS collection,
	CASE WHEN pmrn = 1 THEN CASE WHEN gender IS NOT NULL THEN gender ELSE '' END ELSE '' END AS gender,
 	CASE WHEN pmrn = 1 THEN tag ELSE '' END AS tag,
 	CASE WHEN pmrn = 1 THEN short_description ELSE '' END AS short_description,
 	CASE WHEN pmrn = 1 THEN long_description ELSE '' END AS long_description,
 	CASE WHEN pmrn = 1 THEN setting_style_type ELSE '' END AS setting_style_type,
	CASE WHEN pmrn = 1 THEN is_quantity_track::text ELSE '' END AS is_quantity_track,
 	CASE WHEN size IS NOT NULL THEN size ELSE '' END AS size,
 	CASE WHEN length IS NOT NULL THEN length ELSE '' END AS length,
	CASE WHEN metal IS NOT NULL THEN metal ELSE '' END AS metal,
	CASE WHEN karat IS NOT NULL THEN karat ELSE '' END AS karat,
	CASE WHEN metal_tone IS NOT NULL THEN metal_tone ELSE '' END AS metal_tone,
	CASE WHEN metal_weight IS NOT NULL THEN metal_weight ELSE '' END AS	metal_weight,
	CASE WHEN quantity IS NOT NULL THEN quantity ELSE '' END AS	quantity,
	CASE WHEN side_dia_weight IS NOT NULL THEN side_dia_weight ELSE '' END side_dia_weight,
	CASE WHEN side_dia_count IS NOT NULL THEN side_dia_count ELSE '' END side_dia_count,
	CASE WHEN retail_price IS NOT NULL THEN retail_price::text ELSE '' END retail_price,
	CASE WHEN compare_price IS NOT NULL THEN compare_price::text ELSE '' END compare_price,
	CASE WHEN stone_type IS NOT NULL THEN stone_type ELSE '' END stone_type,
	CASE WHEN d.stone IS NOT NULL THEN d.stone ELSE '' END AS stone,
	'' as stone_category,
	CASE WHEN pmrn = 1 THEN CASE WHEN certification IS NOT NULL THEN certification ELSE '' END ELSE '' END AS certification,
	CASE WHEN d.shape IS NOT NULL THEN d.shape ELSE '' END AS shape	,
	CASE WHEN mm_size IS NOT NULL THEN mm_size ELSE '' END as mm_size,
	CASE WHEN color IS NOT NULL THEN color ELSE '' END	color,
	CASE WHEN clarity IS NOT NULL THEN clarity ELSE '' END clarity,
	CASE WHEN cut IS NOT NULL THEN cut ELSE '' END cut,
	CASE WHEN stone_setting IS NOT NULL THEN stone_setting ELSE '' END stone_setting,
	CASE WHEN stone_weight IS NOT NULL THEN stone_weight::text ELSE '' END stone_weight,
	CASE WHEN stone_count IS NOT NULL THEN stone_count::text ELSE '' END stone_count,
	CASE WHEN pmrn = 1 THEN CASE WHEN additional_detail IS NOT NULL THEN additional_detail ELSE '' END ELSE '' END AS additional_detail,
	CASE WHEN pmrn = 1 THEN CASE WHEN shipping_days IS NOT NULL THEN shipping_days::text ELSE '' END ELSE '' END AS shipping_days
FROM ranked r
LEFT JOIN diamond_ranked d 
    ON r.product_id = d.product_id 
    AND r.pmrn = d.pdrn  
 
ORDER BY r.product_id, r.pmrn`,
      { type: QueryTypes.SELECT }
    );

    return resSuccess({ data: products });
  } catch (error) {
    throw error;
  }
};
