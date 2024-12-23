'''
【表格格式】
无表头
第一列：板瓦/筒瓦
第二列：瓦头/瓦身/瓦尾
第三列：三级分类名，如有四...级分类用/隔开，也写在本列中，#代表在四级分类中复制三级分类名
    （例）凸面直绳纹，凹面浅布纹/内切
          凸面凹棱纹，凹面布纹/#（凸面加斜绳纹）
第四列：整体摄影组号
第五列：标本号
第六列：标本摄影组号

'''

import os
import shutil
import pandas as pd
import sys

def check_folder_and_prompt(folder_name):
    if os.path.exists(folder_name):
        choice = input(f"输出文件夹 {folder_name} 已存在，是否替换？(y/n): ").strip().lower()
        if choice == 'n':
            return False
        elif choice == 'y':
            shutil.rmtree(folder_name)
    os.makedirs(folder_name, exist_ok=True)
    return True

def main():
    try:
        sourceFolder = sys.argv[1]
        exportFolder = sys.argv[4]
        excel_file = sys.argv[2]
        sheetName = sys.argv[3]

        total_photos_folder = os.path.join(sourceFolder, "整体摄影_photos")
        sample_photos_folder = os.path.join(sourceFolder, "标本照_photos")
        total_export_folder = os.path.join(exportFolder, "整体摄影")
        sample_export_folder = os.path.join(exportFolder, "标本照")

        if not os.path.exists(total_photos_folder):
            raise FileNotFoundError(f"请将 {total_photos_folder} 文件夹放在本目录下")
        if not os.path.exists(sample_photos_folder):
            raise FileNotFoundError(f"请将 {sample_photos_folder} 文件夹放在本目录下")
        if not os.path.exists(excel_file):
            raise FileNotFoundError("请将 data.xlsx 放在本目录下")

        t = check_folder_and_prompt(total_export_folder)
        s = check_folder_and_prompt(sample_export_folder)

        data = pd.read_excel(excel_file, sheet_name=sheetName, header=None)
        if data.shape[1] < 6:
            raise ValueError("data.xlsx 格式错误，至少需要 6 列")

        total_photo_files = sorted(os.listdir(total_photos_folder))
        sample_photo_files = sorted(os.listdir(sample_photos_folder))

        # 检查照片数量
        total_photos = len(total_photo_files)
        total_photo_indices = data[3].dropna().astype(str).str.split(',')
        total_max_index = max(
            int(index.strip() or 0) for indices in total_photo_indices for index in indices
        )
        if total_max_index * 2 != total_photos:
            raise ValueError(f"整体摄影当前照片数 {total_photos}，照片序号最大为 {int(total_max_index)}。请重新检查。")

        sample_photos = len(sample_photo_files)
        sample_max_index = pd.to_numeric(data[5], errors='coerce').max()
        if pd.isna(sample_max_index):
            sample_max_index = 0
        if sample_max_index * 2 != sample_photos:
            raise ValueError(f"标本照当前照片数 {sample_photos}，照片序号最大为 {int(sample_max_index)}。请重新检查。")

        if s:
            accuno = sys.argv[5] + sys.argv[6]

        # 整体摄影
        if t:
            third_level_counters = {}
            third_level_names = {}
            target_paths = []

            for i, row in data.iterrows():
                if row[0] == '不明':
                    target_dir = os.path.join(total_export_folder, '不明')
                else:
                    if pd.isna(row[0]) or pd.isna(row[1]) or pd.isna(row[2]) or pd.isna(row[3]):
                        continue
                    
                    first_dir = os.path.join(total_export_folder, str(row[0])).strip()
                    second_dir = os.path.join(first_dir, str(row[1])).strip()
                    
                    if (row[0], row[1]) not in third_level_counters:
                        third_level_counters[(row[0], row[1])] = 0
                        third_level_names[(row[0], row[1])] = {}
                    third_dirs = str(row[2].replace(",", "，").replace("+", "＋")).split("/", 1)
                    third_base = third_dirs[0].strip()
                    sub_path = third_dirs[1].replace('#', third_base).strip() if len(third_dirs) > 1 else ""
                    if third_base not in third_level_names[(row[0], row[1])]:
                        third_level_counters[(row[0], row[1])] += 1
                        unique_third_name = f"{third_level_counters[(row[0], row[1])]}、{third_base}"
                        third_level_names[(row[0], row[1])][third_base] = unique_third_name
                    else:
                        unique_third_name = third_level_names[(row[0], row[1])][third_base]
                    third_dir = os.path.join(second_dir, unique_third_name)
                    target_dir = os.path.join(third_dir, sub_path) if sub_path else third_dir
                    target_paths.append((third_dir, bool(sub_path)))
                    
                os.makedirs(target_dir, exist_ok=True)
                photo_indices = str(row[3]).split(',') if pd.notna(row[3]) else []
                for index in photo_indices:
                    index = index.strip()
                    if not index.isdigit():
                        continue
                    
                    photo_index = int(index) - 1
                    photo_group = total_photo_files[photo_index * 2 : photo_index * 2 + 2]
                    for photo in photo_group:
                        src = os.path.join(total_photos_folder, photo)
                        dest = os.path.join(target_dir, photo)
                        shutil.copy(src, dest)
                
                if row[0] == '不明':
                    print("整√不明")
                else:
                    print(f"整√{row[2]}")

            for path, has_sub in target_paths:
                if not has_sub:
                    continue
                for p, s in target_paths:
                    if p == path and not s:
                        input(f"警告：有带与带备注项的分类主纹饰相同的不带备注项的分类存在，未添加空的/#")

        # 标本
        if s:
            os.makedirs(sample_export_folder, exist_ok=True)
            for i, row in data.iterrows():
                if pd.isna(row[4]) or pd.isna(row[5]):
                    continue

                # 将 row[4] 和 row[5] 转换为字符串并按逗号分割
                markers = str(row[4]).split(',')
                photos = str(row[5]).split(',')

                # 确保逗号数量相等
                if len(markers) != len(photos):
                    print(f"第 {i+1} 行数据错误：标本编号和照片索引数量不匹配")
                    continue

                # 遍历每个标本编号和对应的照片索引
                for marker, photo_index in zip(markers, photos):
                    if pd.isna(marker) or pd.isna(photo_index):
                        continue

                    try:
                        photoi = int(float(photo_index)) - 1
                        photo_group = sample_photo_files[photoi * 2 : photoi * 2 + 2]

                        convex_filename = f"{accuno}标{int(float(marker))}凸面.JPG"
                        concave_filename = f"{accuno}标{int(float(marker))}凹面.JPG"

                        convex_dest = os.path.join(sample_export_folder, convex_filename)
                        concave_dest = os.path.join(sample_export_folder, concave_filename)

                        # 复制凸面照片
                        convex_src = os.path.join(sample_photos_folder, photo_group[0])
                        if os.path.exists(convex_dest):
                            print(f"标本 {int(float(marker))} 重复，请检查data.xlsx")
                            os.remove(convex_dest)
                        shutil.copy(convex_src, convex_dest)

                        # 复制凹面照片
                        concave_src = os.path.join(sample_photos_folder, photo_group[1])
                        if os.path.exists(concave_dest):
                            os.remove(concave_dest)
                        shutil.copy(concave_src, concave_dest)

                        print(f"标√标{int(float(marker))}")

                    except (IndexError, ValueError) as e:
                        print(f"第 {i+1} 行数据错误：{e}")

        print(f"整理完成")

    except Exception as e:
        print(f"发生错误：{e}")
    finally:
        input("输入任意键继续...")

if __name__ == "__main__":
    main()
