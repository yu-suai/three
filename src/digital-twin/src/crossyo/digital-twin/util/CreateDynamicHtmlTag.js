import { CSS3DSprite } from 'three/examples/jsm/renderers/CSS3DRenderer';
import { Box3, Vector3 } from 'three';

export class CreateDynamicHtmlTag {
    constructor(app) {
        this.app = app; // 应用实例
        this.tags = {}; // 用于存储创建的标签引用
        this.positions = {};
    }

    // 创建或更新标签
    setDynamicTag(nodenames, create = true) {
        // console.log("setDynamicTag", nodenames);
        nodenames.forEach((row) => {
            // 获取目标对象，可以是 Group 或 Mesh
            const targetObject = row?.name ? this.app.scene_.getObjectByName(row.name) : null;
            // console.log("targetObject", targetObject, row);
            if (targetObject) {
                // 递归查找第一个 Mesh 子对象（若 targetObject 是 Group）
                const mesh = this.findMesh(targetObject);

                if (mesh) {
                    const div = document.createElement('div');
                    div.className = 'css3d';
                    const boxSize = this.getBoxSize(mesh);
                    let position = row.position || this.calculateBoundingBoxPosition(mesh);
                    const position_ = this.getMatrixWorldPosition(mesh);
                    if (row.positionFormatter) {
                        position = row.positionFormatter(position, position_, boxSize);
                    } else if (!row.position) {
                        position.z -= position_.z + 7;
                        position.x -= boxSize.x / 2;
                        // position.y -= boxSize.y * 1.4 * 0.05;
                        // position.z -= (boxSize.z / 2) * 0.2;
                    }
                    const divClass = ['room-3d'];
                    // console.log('targetObject11', row?.name, row, position);
                    if (row.className) {
                        divClass.push(row.className);
                    }
                    // 标签内容 HTML
                    const innerHTML = `<div class="${divClass.join(' ')}" id="${row.name}">
                      ${
                          row.innerHTML ||
                          `<p class="title">${row.title}</p>
                          ${row.slotHtml || ''}
                          <p>状态：<span class="el-tag el-tag--${row.state} ${
                              row.state === 'success' ? '' : 'el-tag-flash'
                          }">${
                              row.state === 'error'
                                  ? '告警'
                                  : row.state === 'warning'
                                  ? '预警'
                                  : '正常'
                          }</span></p>`
                      }
                    </div>`;
                    div.innerHTML = innerHTML;
                    // console.log(row, position);
                    // 如果标签已存在则更新内容
                    if (this.tags[row.name]) {
                        this.updateTag(row, innerHTML, position);
                    } else if (create) {
                        // 创建新标签
                        this.createTag(row, targetObject, div, position);
                    }
                }
            }
        });
    }

    // 准确获取position
    calculateBoundingBoxPosition(mesh) {
        const box = new Box3().setFromObject(mesh);
        const position = new Vector3();
        box.getCenter(position); // 获取包围盒中心位置
        mesh.localToWorld(position); // 转换为全局坐标

        return position;
    }

    getMatrixWorldPosition(mesh) {
        const position = new Vector3();
        mesh.updateMatrixWorld(); // 确保 matrixWorld 是最新的
        position.setFromMatrixPosition(mesh.matrixWorld);

        return position;
    }

    getBoxSize(obj) {
        const box = new Box3().setFromObject(obj);
        const size = box.getSize(new Vector3());
        return size;
    }

    // 在 Group 中查找第一个 Mesh 子对象
    findMesh(object) {
        if (object.isMesh) return object;
        if (object.isGroup) {
            for (let i = 0; i < object.children.length; i++) {
                const mesh = this.findMesh(object.children[i]);
                if (mesh) return mesh;
            }
        }
        return null;
    }

    // 创建标签并添加到目标对象的父级或场景中
    createTag(row, targetObject, html, position) {
        const tagSprite = new CSS3DSprite(html);

        const parentGroup = targetObject.parent || this.app.origin_root_;
        // tagSprite.position.set(position.x, position.y, position.z); // 调整标签位置

        // 将局部位置转换为全局坐标
        const worldPosition = new Vector3(position.x, position.y, position.z);
        parentGroup.localToWorld(worldPosition);

        tagSprite.position.copy(worldPosition); // 设置全局位置

        if (row.scale) {
            if (Array.isArray(row.scale) && row.scale.length === 3) {
                tagSprite.scale.set(row.scale[0], row.scale[1], row.scale[2]);
            } else {
                tagSprite.scale.set(row.scale, row.scale, row.scale);
            }
        } else {
            tagSprite.scale.set(0.05, 0.05, 0.05);
        }
        // console.log('tagSprite', parentGroup, tagSprite)

        // 若目标对象有父级，将标签插入到父级；否则插入到根场景
        parentGroup.add(tagSprite);
        this.tags[row.name] = tagSprite;
        this.positions[row.name] = worldPosition;
        // 绑定点击事件
        html.onclick = (event) => {
            // console.log('click', event);
            this.app.emit('dynamicTagClick', {
                name: row.name,
                row,
                event,
            });
            event.stopPropagation();
        };
    }

    // 更新标签内容或位置
    updateTag(row, html, position) {
        const tag = this.tags[row.name];
        const oldPotion = this.positions[row.name];
        // console.log('updateTag', row.name, oldPotion, position)
        if (tag) {
            tag.element.innerHTML = html;
            if(row.updatePosition !== false) {
              if(row.ressetPosition) {
                tag.position.set(position.x, position.y, position.z);
              } else {
                tag.position.set(oldPotion.x, oldPotion.y, oldPotion.z);
              }
            }
        }
    }

    // 清除所有标签
    clearTags(nomes = []) {
        // 如果 nomes 为空数组，则删除所有标签；否则只删除指定标签
        const namesToDelete = nomes.length > 0 ? nomes : Object.keys(this.tags);

        namesToDelete.forEach((name) => {
            const tag = this.tags[name];
            if (tag) {
                if (tag.parent) {
                    tag.parent.remove(tag); // 从父级中移除
                }
                tag.element.remove(); // 删除 HTML 元素
                delete this.tags[name]; // 从 tags 对象中删除引用
            }
        });
    }
}
